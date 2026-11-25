import json
import re
import uuid
from datetime import timedelta
from unittest.mock import patch
from django.utils import timezone
from urllib.parse import parse_qs, urlparse
from django.test import TestCase, Client, override_settings
from django.core import mail
from django.core.cache import cache
from .models import User, EmailVerification, Dialog, Message

@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', SESSION_COOKIE_SECURE=False, CSRF_COOKIE_SECURE=False)
class SvyazTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client(enforce_csrf_checks=True)
        self.password = 'NightWindow_9026!'

    def post(self, action, data, client=None):
        client = client or self.client
        csrf = client.get('/api/svyaz/session').json()['csrf']
        return client.post('/api/svyaz/'+action, json.dumps(data), content_type='application/json', HTTP_X_CSRFTOKEN=csrf)

    def member(self, name):
        return User.objects.create_user(username=name, email=name+'@example.test', password=self.password)

    def email_token(self):
        link = re.search(r'https?://\S+', mail.outbox[-1].body).group()
        return {k:v[0] for k,v in parse_qs(urlparse(link).fragment).items()}

    def test_registration_confirmation_login_and_password_recovery(self):
        data={'username':'Tester','email':'TEST@example.test','password':self.password,'password2':self.password}
        self.assertEqual(self.post('register',data).status_code,201)
        user=User.objects.get(username='tester')
        self.assertFalse(user.is_active)
        self.assertNotEqual(user.password,self.password)
        self.assertIn('MAKSON PROJECT',mail.outbox[-1].subject)
        self.assertIn('MAKSON PROJECT',mail.outbox[-1].alternatives[0].content)
        self.assertEqual(self.post('login',{'identity':'tester','password':self.password}).status_code,401)
        code=re.search(r'^\d{6}$',mail.outbox[-1].body,re.M).group()
        token={'email':user.email,'code':code}
        self.assertEqual(self.post('verify-code',token).status_code,200)
        self.assertEqual(self.post('verify-code',token).status_code,400)
        self.assertEqual(self.post('login',{'identity':'TEST@example.test','password':self.password}).status_code,200)
        self.assertEqual(self.client.get('/api/svyaz/session').json()['user']['username'],'tester')
        self.assertEqual(self.post('recover',{'email':'test@example.test'}).status_code,200)
        reset=self.email_token()
        reset.update(password='NewNightWindow_9826!',password2='NewNightWindow_9826!')
        self.assertEqual(self.post('reset',reset).status_code,200)
        self.assertEqual(self.post('reset',reset).status_code,400)
        self.assertIsNone(self.client.get('/api/svyaz/session').json()['user'])

    def test_code_expiry_attempts_resend_and_leading_zero(self):
        from .views import mail as send_mail
        user=User.objects.create_user(username='pending',email='pending@example.test',is_active=False)
        with patch('chat.views.secrets.randbelow',return_value=123):
            send_mail(user,'verify')
        self.assertIn('000123',mail.outbox[-1].body)
        self.assertNotIn('000123',EmailVerification.objects.get(user=user).digest)
        self.assertEqual(self.post('resend',{'email':user.email}).status_code,429)
        for _ in range(5):
            self.assertEqual(self.post('verify-code',{'email':user.email,'code':'999999'}).status_code,400)
        self.assertEqual(EmailVerification.objects.get(user=user).attempts,5)
        self.assertEqual(self.post('verify-code',{'email':user.email,'code':'000123'}).status_code,400)
        EmailVerification.objects.filter(user=user).update(sent_at=timezone.now()-timedelta(seconds=61))
        with patch('chat.views.secrets.randbelow',return_value=456):
            self.assertEqual(self.post('resend',{'email':user.email}).status_code,200)
        self.assertEqual(self.post('verify-code',{'email':user.email,'code':'000123'}).status_code,400)
        EmailVerification.objects.filter(user=user).update(expires_at=timezone.now()-timedelta(seconds=1))
        self.assertEqual(self.post('verify-code',{'email':user.email,'code':'000456'}).status_code,400)
        user.refresh_from_db();self.assertFalse(user.is_active)
        EmailVerification.objects.filter(user=user).update(expires_at=timezone.now()+timedelta(minutes=10))
        self.assertEqual(self.post('verify-code',{'email':user.email,'code':'000456'}).status_code,200)
        user.refresh_from_db();self.assertTrue(user.is_active)

    def test_case_insensitive_identity_and_csrf(self):
        self.member('testa')
        self.assertEqual(self.client.post('/api/svyaz/logout', '{}',content_type='application/json').status_code,403)
        r=self.post('register',{'username':'TESTA','email':'other@example.test','password':self.password,'password2':self.password})
        self.assertEqual(r.status_code,400)
        r=self.post('register',{'username':'another','email':'TESTA@example.test','password':self.password,'password2':self.password})
        self.assertEqual(r.status_code,400)
        csrf=self.client.get('/api/svyaz/session').json()['csrf']
        r=self.client.post('/api/svyaz/login','{}',content_type='application/json',HTTP_X_CSRFTOKEN=csrf,HTTP_ORIGIN='https://sndtag.ru')
        self.assertEqual(r.status_code,403)

    def test_private_dialogs_idempotency_unread_receipts_and_block(self):
        alice,bob,eve=[self.member(n) for n in ['alice','bob','eve']]
        self.client.force_login(alice)
        other=Client(enforce_csrf_checks=True);other.force_login(bob)
        attacker=Client(enforce_csrf_checks=True);attacker.force_login(eve)
        opened=self.post('open',{'user':bob.pk}).json()
        pk=opened['dialog']
        self.assertEqual(self.post('open',{'user':alice.pk},other).json()['dialog'],pk)
        data={'dialog':pk,'body':'<img src=x onerror=alert(1)>','nonce':str(uuid.uuid4())}
        sent=self.post('send',data)
        self.assertEqual(sent.status_code,201)
        self.assertEqual(self.post('send',data).status_code,200)
        self.assertEqual(Message.objects.count(),1)
        self.assertEqual(attacker.get('/api/svyaz/messages',{'dialog':pk}).status_code,404)
        self.assertEqual(self.post('send',{**data,'nonce':str(uuid.uuid4())},attacker).status_code,404)
        self.assertEqual(other.get('/api/svyaz/dialogs').json()['dialogs'][0]['unread'],1)
        mid=sent.json()['message']['id']
        self.assertEqual(self.post('read',{'dialog':pk,'last':mid},other).status_code,200)
        self.assertEqual(other.get('/api/svyaz/dialogs').json()['dialogs'][0]['unread'],0)
        self.assertEqual(self.client.get('/api/svyaz/messages',{'dialog':pk}).json()['peerRead'],mid)
        self.assertEqual(self.post('block',{'dialog':pk,'blocked':True},other).status_code,200)
        self.assertEqual(self.post('send',{**data,'nonce':str(uuid.uuid4())}).status_code,403)
        self.assertEqual(self.post('block',{'dialog':pk,'blocked':False},other).status_code,200)
        self.assertEqual(self.post('send',{**data,'nonce':str(uuid.uuid4())}).status_code,201)
        self.assertNotIn('email',self.client.get('/api/svyaz/search',{'q':'bo'}).json()['users'][0])

    def test_pagination_and_nonce_cannot_cross_dialogs(self):
        a,b,c=[self.member(n) for n in ['aa','bb','cc']]
        self.client.force_login(a)
        first=Dialog.objects.create(first=a,second=b)
        second=Dialog.objects.create(first=a,second=c)
        rows=Message.objects.bulk_create([Message(dialog=first,author=b,body=str(i)) for i in range(70)])
        latest=self.client.get('/api/svyaz/messages',{'dialog':first.pk}).json()
        self.assertEqual(len(latest['messages']),50)
        self.assertTrue(latest['more'])
        older=self.client.get('/api/svyaz/messages',{'dialog':first.pk,'before':latest['messages'][0]['id']}).json()
        self.assertEqual(len(older['messages']),20)
        nonce=str(uuid.uuid4())
        self.assertEqual(self.post('send',{'dialog':first.pk,'body':'hi','nonce':nonce}).status_code,201)
        self.assertEqual(self.post('send',{'dialog':second.pk,'body':'hi','nonce':nonce}).status_code,409)

    def test_rate_limit_and_logout(self):
        user=self.member('tester');self.client.force_login(user)
        self.assertEqual(self.post('logout',{}).status_code,200)
        self.assertEqual(self.client.get('/api/svyaz/dialogs').status_code,401)
        for _ in range(12):
            self.post('login',{'identity':'tester','password':'wrong'})
        self.assertEqual(self.post('login',{'identity':'tester','password':'wrong'}).status_code,429)

    def test_personal_records_are_owned_idempotent_and_aggregated_by_game(self):
        a,b=self.member('record_a'),self.member('record_b')
        self.client.force_login(a)
        other=Client(enforce_csrf_checks=True);other.force_login(b)
        for game,mode in [('asteroid','sprint'),('asteroid','endless'),('naval','classic'),('pulse','classic')]:
            run=self.post('record-start',{'game':game,'mode':mode,'key':game+mode}).json()['run']
            data={'run':run,'outcome':'win','duration':45.2,'score':350,'distance':20000,'rounds':3,'completed':True}
            self.assertEqual(self.post('record-finish',data,other).status_code,404)
            self.assertEqual(self.post('record-finish',data).status_code,200)
            self.assertEqual(self.post('record-finish',data).status_code,200)
        stats=self.client.get('/api/svyaz/stats').json()
        self.assertEqual(len(stats['recent']),4)
        self.assertEqual(sum(row['wins'] for row in stats['totals']),4)
        self.assertEqual(other.get('/api/svyaz/stats').json()['totals'],[])
        run=self.post('record-start',{'game':'pulse','mode':'classic','key':'new'}).json()['run']
        self.assertEqual(self.post('record-finish',{'run':run,'outcome':'win','duration':float('nan')}).status_code,400)
