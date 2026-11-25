"""Authenticated WebRTC signalling. Audio never enters the application database."""
import base64
import hashlib
import hmac
import json
import time
import uuid
from datetime import timedelta
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.http import JsonResponse
from django.utils import timezone
from .models import User, Dialog, VoiceCall, VoiceMember, VoiceSignal
from .social import blocked, relationship

ACTIONS={'voice-state','voice-create','voice-join','voice-leave','voice-invite','voice-signal','voice-config'}
MAX_MEMBERS=6

def sweep(now):
    VoiceMember.objects.filter(state='joined',last_seen__lt=now-timedelta(seconds=45)).update(state='left')
    VoiceMember.objects.filter(state='invited',last_seen__lt=now-timedelta(seconds=60)).update(state='missed')
    VoiceCall.objects.filter(ended_at=None).exclude(members__state='joined').update(ended_at=now)
    VoiceSignal.objects.filter(created_at__lt=now-timedelta(seconds=120)).delete()
    VoiceCall.objects.filter(ended_at__lt=now-timedelta(days=1)).delete()

def room_json(call):
    return {'id':str(call.pk),'creator':call.creator_id,'started':call.created_at.isoformat(),
            'members':[{'id':m.user_id,'name':m.user.display_name or m.user.username,'state':m.state,
                        'session':str(m.session),'muted':m.muted,'deafened':m.deafened}
                       for m in call.members.select_related('user').all()]}

def invite(call,user,ids,now):
    from .views import fail, numeric, limit
    if not isinstance(ids,list) or not 1<=len(ids)<=5: fail('Выбери от 1 до 5 собеседников.')
    ids=set(numeric(i) for i in ids)-{user.pk}
    if not ids: fail('Выбери собеседника.')
    limit('voice-invites',user.pk,30,600)
    for uid in ids:
        peer=User.objects.filter(pk=uid,is_active=True).first()
        if not peer or blocked(user,peer): fail('Звонок этому пользователю недоступен.',403)
        rel=relationship(user,peer)
        if not (rel and rel.accepted) and not Dialog.objects.filter(Q(first=user,second=peer)|Q(first=peer,second=user)).exists():
            fail('Сначала открой диалог или добавь пользователя в друзья.',403)
        # No member can bridge a blocked pair into a group call.
        for member in call.members.filter(state__in=['joined','invited']).select_related('user'):
            if member.user_id!=uid and blocked(member.user,peer): fail('Участники не могут быть в одном звонке.',403)
        existing=call.members.filter(user=peer).first()
        if existing and existing.state in ['joined','invited']: continue
        if existing and existing.state in ['declined','left']: fail('Пользователь уже покинул или отклонил этот звонок.')
        if call.members.filter(state__in=['joined','invited']).count()>=MAX_MEMBERS: fail('В звонке максимум 6 человек.')
        if VoiceMember.objects.filter(user=peer,state='joined',call__ended_at=None).exists(): fail('Собеседник уже в другом звонке.',409)
        VoiceMember.objects.update_or_create(call=call,user=peer,defaults={'state':'invited','last_seen':now})

def handle(request,action,data):
    from .views import fail, numeric, limit
    user=request.user;now=timezone.now()
    if action=='voice-config':
        secret=settings.CONFIG.get('TURN_SECRET')
        urls=settings.CONFIG.get('TURN_URLS',[])
        if not secret or not urls: fail('Голосовой сервер ещё настраивается.',503)
        username=f'{int(time.time())+43200}:{user.pk}'
        credential=base64.b64encode(hmac.new(secret.encode(),username.encode(),hashlib.sha1).digest()).decode()
        return JsonResponse({'iceServers':[{'urls':urls,'username':username,'credential':credential}],'maxMembers':MAX_MEMBERS})
    with transaction.atomic():
        sweep(now)
        if action=='voice-create':
            limit('voice-create',user.pk,12,600)
            if VoiceMember.objects.filter(user=user,state='joined',call__ended_at=None).exists(): fail('Сначала заверши текущий звонок.',409)
            call=VoiceCall.objects.create(creator=user)
            member=VoiceMember.objects.create(call=call,user=user,state='joined',last_seen=now)
            invite(call,user,data.get('users'),now)
            return JsonResponse({'call':room_json(call),'session':str(member.session)})
        if action=='voice-state' and not data.get('call'):
            pending=VoiceCall.objects.filter(ended_at=None,members__user=user,members__state='invited').order_by('-created_at')[:6]
            return JsonResponse({'incoming':[room_json(c) for c in pending]})
        try: call_id=uuid.UUID(str(data.get('call','')))
        except (ValueError,TypeError): fail('Звонок не найден.',404)
        member=VoiceMember.objects.select_related('call').filter(user=user,call_id=call_id).first()
        if not member: fail('Нет доступа к звонку.',403)
        call=member.call
        if action=='voice-leave':
            if member.state=='joined' and str(member.session)!=data.get('session'): fail('Звонок открыт на другом устройстве.',409)
            member.state='declined' if member.state=='invited' else 'left';member.save(update_fields=['state'])
            sweep(now);return JsonResponse({'ok':True})
        if call.ended_at: fail('Звонок завершён.',410)
        if action=='voice-join':
            if member.state!='invited': fail('Приглашение уже обработано.',409)
            if VoiceMember.objects.filter(user=user,state='joined',call__ended_at=None).exists(): fail('Сначала заверши текущий звонок.',409)
            for other in call.members.filter(state='joined').select_related('user'):
                if blocked(user,other.user): fail('Звонок недоступен.',403)
            if call.members.filter(state='joined').count()>=MAX_MEMBERS: fail('Звонок заполнен.',409)
            member.state='joined';member.session=uuid.uuid4();member.last_seen=now;member.save()
            return JsonResponse({'call':room_json(call),'session':str(member.session)})
        if member.state!='joined' or str(member.session)!=data.get('session'): fail('Ты не подключён к этому звонку.',403)
        if action=='voice-invite':
            invite(call,user,data.get('users'),now);return JsonResponse({'call':room_json(call)})
        if action=='voice-state':
            for other in call.members.filter(state='joined').exclude(pk=member.pk).select_related('user'):
                if blocked(user,other.user):
                    member.state='left';member.save(update_fields=['state'])
                    return JsonResponse({'error':'Звонок прерван из-за блокировки.'},status=403)
            member.last_seen=now;member.muted=data.get('muted') is True;member.deafened=data.get('deafened') is True;member.save(update_fields=['last_seen','muted','deafened'])
            signals=list(VoiceSignal.objects.filter(recipient=member,recipient_session=member.session,id__gt=numeric(data.get('after',0))).select_related('sender').order_by('id')[:200])
            return JsonResponse({'call':room_json(call),'signals':[{'id':s.pk,'from':s.sender.user_id,'session':str(s.sender_session),'payload':s.payload} for s in signals]})
        if action=='voice-signal':
            target=call.members.filter(user_id=numeric(data.get('to')),state='joined').exclude(pk=member.pk).first()
            if not target or str(target.session)!=data.get('targetSession'): fail('Собеседник отключился.',409)
            if blocked(user,target.user): fail('Звонок недоступен.',403)
            payload=data.get('payload')
            if not isinstance(payload,dict) or payload.get('type') not in ['offer','answer','ice'] or len(json.dumps(payload))>12000: fail('Некорректный сигнал.')
            if payload['type'] in ['offer','answer'] and (not isinstance(payload.get('sdp'),str) or len(payload['sdp'])>10000): fail('Некорректное описание соединения.')
            if payload['type']=='ice' and (not isinstance(payload.get('candidate'),dict) or len(json.dumps(payload['candidate']))>2000): fail('Некорректный кандидат.')
            VoiceSignal.objects.create(call=call,sender=member,recipient=target,sender_session=member.session,recipient_session=target.session,payload=payload)
            return JsonResponse({'ok':True})
    fail('Неизвестное действие.')
