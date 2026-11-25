from unittest.mock import patch
from io import BytesIO
from .tests import SvyazTests
from .models import Friendship, Notification, GameInvite

class SocialTests(SvyazTests):
    def test_friendship_invite_ownership_and_block(self):
        a,b,c=[self.member(n) for n in ['sender','recipient','outsider']]
        self.client.force_login(a)
        self.assertEqual(self.post('friend-request',{'user':b.pk}).status_code,200)
        self.assertEqual(self.post('friend-answer',{'user':b.pk,'accept':True}).status_code,409)
        self.client.force_login(b)
        self.assertEqual(self.post('friend-answer',{'user':a.pk,'accept':True}).status_code,200)
        self.assertTrue(Friendship.objects.get().accepted)
        self.client.force_login(a)
        with patch('chat.social.urlopen',return_value=BytesIO(b'{"roomId":"unique-room"}')):
            self.assertEqual(self.post('invite',{'user':b.pk,'game':'pulse','code':'123','token':'a'*48}).status_code,200)
        inv=GameInvite.objects.get()
        self.client.force_login(c)
        self.assertEqual(self.post('invite-answer',{'id':inv.pk,'accept':True}).status_code,404)
        self.assertEqual(self.client.get('/api/svyaz/social').json()['notifications'],[])
        self.client.force_login(b)
        self.assertEqual(self.post('invite-answer',{'id':inv.pk,'accept':True}).json()['roomId'],'unique-room')
        dialog=self.post('open',{'user':a.pk}).json()['dialog']
        self.assertEqual(self.post('block',{'dialog':dialog,'blocked':True}).status_code,200)
        self.assertFalse(Friendship.objects.exists())
        self.assertEqual(self.post('friend-request',{'user':a.pk}).status_code,403)

    def test_push_rejects_arbitrary_endpoints_and_message_notification(self):
        a,b=self.member('aaa'),self.member('bbb');self.client.force_login(a)
        self.assertEqual(self.post('push-subscribe',{'endpoint':'https://127.0.0.1/private'}).status_code,400)
        dialog=self.post('open',{'user':b.pk}).json()['dialog']
        import uuid
        payload={'dialog':dialog,'body':'hello','nonce':str(uuid.uuid4())}
        self.post('send',payload);self.post('send',payload)
        self.assertEqual(Notification.objects.filter(recipient=b,kind='message').count(),1)
