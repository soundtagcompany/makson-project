import json
import time
from datetime import timedelta
from django.conf import settings
from django.core.management.base import BaseCommand
from django.contrib.sessions.models import Session
from django.db import close_old_connections
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from pywebpush import webpush, WebPushException
from chat.models import Notification, PushSubscription, Block, GameInvite

class Command(BaseCommand):
    help='Deliver queued account notifications through Web Push.'
    def handle(self,*args,**options):
        while True:
            try:
                close_old_connections()
                rows=Notification.objects.filter(pushed=False,push_attempts__lt=3,created_at__gte=timezone.now()-timedelta(minutes=15)).select_related('actor','recipient').order_by('id')[:30]
                for n in rows:
                    failed=False
                    if not n.read and not Block.objects.filter(owner=n.recipient,target=n.actor).exists():
                        inv=GameInvite.objects.filter(pk=n.target,status='pending',expires_at__gt=timezone.now()).first() if n.kind=='invite' else None
                        if n.kind=='invite' and not inv:
                            n.pushed=True;n.save(update_fields=['pushed']);continue
                        labels={'message':'новое сообщение','friend-request':'заявка в друзья','friend-accepted':'теперь вы друзья','invite':'приглашение в игру'}
                        payload=json.dumps({'body':(n.actor.display_name or n.actor.username)+': '+labels.get(n.kind,'уведомление'),'tag':'svyaz-'+str(n.recipient_id)+'-'+n.kind+'-'+str(n.target)})
                        for sub in PushSubscription.objects.filter(user=n.recipient):
                            session=Session.objects.filter(session_key=sub.session_key,expire_date__gt=timezone.now()).first()
                            data=session.get_decoded() if session else {}
                            if str(data.get('_auth_user_id'))!=str(n.recipient_id) or not constant_time_compare(str(data.get('_auth_user_hash','')),n.recipient.get_session_auth_hash()):
                                sub.delete();continue
                            try:
                                webpush({'endpoint':sub.endpoint,'keys':sub.keys},payload,vapid_private_key=settings.CONFIG['VAPID_PRIVATE_KEY'],vapid_claims={'sub':'mailto:info@sndtag.ru'},ttl=900,timeout=5)
                            except WebPushException as e:
                                if e.response is not None and e.response.status_code in [404,410]: sub.delete()
                                else: failed=True
                            except Exception: failed=True
                    n.push_attempts+=1;n.pushed=not failed;n.save(update_fields=['push_attempts','pushed'])
                Notification.objects.filter(created_at__lt=timezone.now()-timedelta(days=30)).delete()
            except Exception:
                self.stderr.write('Push batch failed; retrying.')
            time.sleep(5)
