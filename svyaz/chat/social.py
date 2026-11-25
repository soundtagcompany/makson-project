import base64
import json
import re
from datetime import timedelta
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.http import JsonResponse
from django.utils import timezone
from .models import Dialog, Message, User, Block, Friendship, GameInvite, Notification, PushSubscription

READS={'social','push-config'}
ACTIONS=READS|{'friend-request','friend-answer','friend-remove','invite','invite-answer','notification-read','push-subscribe','push-unsubscribe'}

def notify(recipient,actor,kind,target):
    return Notification.objects.create(recipient=recipient,actor=actor,kind=kind,target=target)

def blocked(a,b):
    return Block.objects.filter(Q(owner=a,target=b)|Q(owner=b,target=a)).exists()

def relationship(a,b):
    first,second=sorted([a.pk,b.pk])
    return Friendship.objects.filter(first_id=first,second_id=second).first()

def serialize(n):
    from .views import person
    row={'id':n.pk,'actor':person(n.actor),'kind':n.kind,'target':n.target,'read':n.read,'at':n.created_at.isoformat()}
    if n.kind=='invite':
        inv=GameInvite.objects.filter(pk=n.target).first()
        row['invite']={'game':inv.game,'code':inv.code,'status':inv.status if inv.expires_at>timezone.now() else 'expired'} if inv else None
    if n.kind=='friend-request':
        row['pending']=Friendship.objects.filter(pk=n.target,accepted=False).exists()
    return row

def handle(request,action,data):
    from .views import fail, limit, numeric, person
    user=request.user
    if action=='push-config':
        return JsonResponse({'key':settings.CONFIG.get('VAPID_PUBLIC_KEY','')})
    if action=='social':
        rows=Friendship.objects.filter(Q(first=user)|Q(second=user)).select_related('first','second')
        friends=[{'id':r.pk,'peer':person(r.second if r.first_id==user.pk else r.first),'state':'accepted' if r.accepted else 'outgoing' if r.requester_id==user.pk else 'incoming'} for r in rows]
        notes=Notification.objects.filter(recipient=user).select_related('actor').order_by('-id')
        return JsonResponse({'friends':friends,'notifications':[serialize(n) for n in notes[:50]],'unread':notes.filter(read=False).count()})
    if action=='notification-read':
        notes=Notification.objects.filter(recipient=user)
        if data.get('through'): notes=notes.filter(pk__lte=numeric(data['through']))
        else: notes=notes.filter(pk=numeric(data.get('id')))
        notes.update(read=True)
        return JsonResponse({'ok':True})
    if action in ['push-subscribe','push-unsubscribe']:
        endpoint=str(data.get('endpoint',''))
        if action=='push-unsubscribe':
            PushSubscription.objects.filter(user=user,session_key=request.session.session_key).delete()
            return JsonResponse({'ok':True})
        limit('push-subscription',user.pk,20,3600)
        url=urlparse(endpoint);host=url.hostname or ''
        allowed=host in ['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'] or host.endswith('.notify.windows.com') or host.endswith('.push.services.mozilla.com')
        if not allowed or url.scheme!='https' or url.port not in [None,443] or url.username or url.password or len(endpoint)>2048:
            fail('Этот сервис уведомлений пока не поддерживается.')
        keys=data.get('keys',{})
        try:
            for key,length in [('p256dh',65),('auth',16)]:
                value=keys[key]
                if not isinstance(value,str) or len(value)>100 or not re.fullmatch(r'[A-Za-z0-9_-]+={0,2}',value) or len(base64.urlsafe_b64decode(value+'='*(-len(value)%4)))!=length: raise ValueError()
        except (ValueError,KeyError,TypeError): fail('Некорректная подписка.')
        if not settings.CONFIG.get('VAPID_PUBLIC_KEY'): fail('Уведомления пока настраиваются.',503)
        with transaction.atomic():
            if PushSubscription.objects.filter(user=user).count()>=10 and not PushSubscription.objects.filter(user=user,endpoint=endpoint).exists(): fail('Уже подключено 10 устройств.')
            PushSubscription.objects.update_or_create(endpoint=endpoint,defaults={'user':user,'keys':keys,'session_key':request.session.session_key})
        return JsonResponse({'ok':True})
    if action in ['friend-request','friend-answer','friend-remove','invite']:
        peer=User.objects.filter(pk=numeric(data.get('user')),is_active=True).exclude(pk=user.pk).first()
        if not peer: fail('Пользователь не найден.',404)
        if blocked(user,peer): fail('Взаимодействие с этим пользователем заблокировано.',403)
        if action=='friend-request':
            limit('friend-requests',user.pk,30,3600)
            first,second=sorted([user.pk,peer.pk])
            with transaction.atomic():
                rel,created=Friendship.objects.get_or_create(first_id=first,second_id=second,defaults={'requester':user})
                if created: notify(peer,user,'friend-request',rel.pk)
            return JsonResponse({'ok':True})
        rel=relationship(user,peer)
        if not rel: fail('Заявка или дружба не найдена.',404)
        if action=='friend-answer':
            with transaction.atomic():
                rel=relationship(user,peer)
                if not rel or rel.accepted or rel.requester_id==user.pk: fail('Эта заявка уже обработана.',409)
                Notification.objects.filter(recipient=user,kind='friend-request',target=rel.pk).update(read=True)
                if data.get('accept') is True:
                    rel.accepted=True;rel.save(update_fields=['accepted']);notify(peer,user,'friend-accepted',user.pk)
                else: rel.delete()
            return JsonResponse({'ok':True})
        if action=='friend-remove':
            rel.delete()
            GameInvite.objects.filter(Q(sender=user,recipient=peer)|Q(sender=peer,recipient=user),status='pending').update(status='cancelled')
            Notification.objects.filter(Q(recipient=user,actor=peer)|Q(recipient=peer,actor=user),kind__in=['invite','friend-request']).update(read=True)
            return JsonResponse({'ok':True})
        if not rel.accepted: fail('Сначала добавьте друг друга в друзья.',403)
        limit('invitations',user.pk,30,600)
        game=str(data.get('game',''));code=str(data.get('code',''));token=str(data.get('token',''))
        if game not in ['asteroid','naval','pulse','shabash','importopoly'] or not re.fullmatch(r'\d{4}' if game=='importopoly' else r'\d{3}',code) or not re.fullmatch(r'[a-f0-9]{32,64}',token): fail('Некорректная комната.')
        path='/importopoly/api/invite' if game=='importopoly' else '/api/invite' if game=='asteroid' else '/api/'+game+'/invite'
        try:
            req=Request('http://127.0.0.1:'+str(settings.CONFIG.get('GAME_PORT',4173 if settings.DEBUG else 3179))+path,data=json.dumps({'code':code,'token':token}).encode(),headers={'Content-Type':'application/json'})
            with urlopen(req,timeout=4) as response: room=json.load(response)
        except HTTPError as e:
            fail('Комната закрыта, занята или игра уже началась.',409)
        except (URLError,ValueError,TimeoutError): fail('Игровой сервер не отвечает.',503)
        with transaction.atomic():
            if blocked(user,peer) or not Friendship.objects.filter(pk=rel.pk,accepted=True).exists(): fail('Приглашение недоступно.',403)
            inv=GameInvite.objects.filter(sender=user,recipient=peer,game=game,room_id=room['roomId'],status='pending',expires_at__gt=timezone.now()).first()
            if not inv:
                inv=GameInvite.objects.create(sender=user,recipient=peer,game=game,code=code,room_id=room['roomId'],expires_at=timezone.now()+timedelta(minutes=15))
                notify(peer,user,'invite',inv.pk)
                first,second=sorted([user.pk,peer.pk])
                dialog,_=Dialog.objects.get_or_create(first_id=first,second_id=second)
                names={'asteroid':'ГИПНОРОЙДЕР','naval':'МОРСКАЯ ДВИЖУХА','pulse':'ПУЛЬС','shabash':'ШАБАШ','importopoly':'СДВГПОЛИЯ'}
                message=Message.objects.create(dialog=dialog,author=user,body='ПРИГЛАШЕНИЕ В '+names[game],invite=inv)
                Dialog.objects.filter(pk=dialog.pk).update(updated_at=message.created_at)
        return JsonResponse({'ok':True})
    if action=='invite-answer':
        with transaction.atomic():
            inv=GameInvite.objects.filter(pk=numeric(data.get('id')),recipient=user).select_related('sender').first()
            if not inv: fail('Приглашение не найдено.',404)
            if inv.expires_at<=timezone.now() or inv.status not in ['pending','accepted']: fail('Приглашение уже недействительно.',410)
            rel=relationship(user,inv.sender)
            if blocked(user,inv.sender) or not rel or not rel.accepted: fail('Приглашение недоступно.',403)
            inv.status='accepted' if data.get('accept') is True else 'declined';inv.save(update_fields=['status'])
            Notification.objects.filter(recipient=user,kind='invite',target=inv.pk).update(read=True)
        return JsonResponse({'game':inv.game,'code':inv.code,'roomId':inv.room_id})
