import io
import tempfile
import uuid
from PIL import Image
from django.test import TestCase, override_settings, Client
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.cache import cache
from .models import User, Dialog, Message, Block, GameInvite
from django.utils import timezone
from datetime import timedelta

class PhotoTests(TestCase):
    def test_private_photo_retry_validation_and_block(self):
        cache.clear()
        users=[User.objects.create_user(username=n,email=n+'@example.test') for n in ['sender','recipient','outsider']]
        dialog=Dialog.objects.create(first=users[0],second=users[1])
        client=Client(enforce_csrf_checks=True);client.force_login(users[0])
        csrf=client.get('/api/svyaz/session').json()['csrf']
        image=io.BytesIO();Image.new('RGB',(80,50),'red').save(image,'PNG')
        nonce=str(uuid.uuid4())
        def send(content=image.getvalue(),token=csrf):
            return client.post('/api/svyaz/send-photo',{'dialog':dialog.pk,'body':'Снимок','nonce':nonce,'photo':SimpleUploadedFile('photo.png',content,content_type='image/png')},HTTP_X_CSRFTOKEN=token)
        with tempfile.TemporaryDirectory() as directory,override_settings(SVYAZ_PHOTO_ROOT=directory):
            self.assertEqual(send(token='').status_code,403)
            self.assertEqual(send(b'not an image').status_code,400)
            result=send();self.assertEqual(result.status_code,201,result.content)
            photo=result.json()['message']['photo'];self.assertEqual(photo['width'],80)
            self.assertEqual(send().status_code,200);self.assertEqual(Message.objects.count(),1)
            client.force_login(users[2]);self.assertEqual(client.get(photo['url']).status_code,404)
            client.force_login(users[1]);response=client.get(photo['url']);self.assertEqual(response.status_code,200);response.close()
            client.logout();self.assertEqual(client.get(photo['url']).status_code,401)
            client.force_login(users[0]);csrf=client.get('/api/svyaz/session').json()['csrf']
            Block.objects.create(owner=users[1],target=users[0]);self.assertEqual(send().status_code,403)

    def test_invite_status_is_returned_when_polling_after_message(self):
        a=User.objects.create_user(username='a',email='a@example.test');b=User.objects.create_user(username='b',email='b@example.test')
        d=Dialog.objects.create(first=a,second=b)
        inv=GameInvite.objects.create(sender=a,recipient=b,game='asteroid',code='123',room_id='room',expires_at=timezone.now()+timedelta(minutes=10))
        m=Message.objects.create(dialog=d,author=a,body='Приглашение',invite=inv)
        self.client.force_login(b)
        data=self.client.get('/api/svyaz/messages',{'dialog':d.pk}).json();self.assertEqual(data['messages'][0]['invite']['status'],'pending')
        inv.status='accepted';inv.save()
        data=self.client.get('/api/svyaz/messages',{'dialog':d.pk,'after':m.pk}).json();self.assertEqual(data['messages'],[]);self.assertEqual(data['invites'][0]['status'],'accepted')
