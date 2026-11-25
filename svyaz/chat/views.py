import hashlib
import json
import logging
import math
import re
import secrets
import threading
import time
import uuid
from datetime import timedelta
from urllib.parse import urlencode
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.mail import EmailMultiAlternatives
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.db.models import Q, F, Max, Min, Count, OuterRef, Subquery
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.crypto import salted_hmac, constant_time_compare
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.views.decorators.cache import never_cache
from .models import User, EmailVerification, Dialog, Message, Block, GameResult
from .tokens import confirmation_token
from . import social
from . import voice
from .models import Notification, PushSubscription, Friendship, GameInvite

lock = threading.Lock()

class ApiError(Exception):
    def __init__(self, message, status=400):
        self.message, self.status = message, status

def fail(message, status=400):
    raise ApiError(message, status)

def limit(scope, identity, maximum, seconds):
    key = 'svyaz:' + hashlib.sha256(f'{scope}:{identity}:{int(time.time())//seconds}'.encode()).hexdigest()
    with lock:
        n = cache.get(key, 0) + 1
        cache.set(key, n, seconds)
    if n > maximum:
        fail('Слишком часто. Попробуй немного позже.', 429)

def person(user):
    return {'id': user.pk, 'username': user.username, 'name': user.display_name or user.username, 'online': bool(user.last_seen and (timezone.now()-user.last_seen).total_seconds()<75)}

def code_digest(user, nonce, code):
    return salted_hmac('makson.email-code', f'{user.pk}:{user.email}:{nonce}:{code}', algorithm='sha256').hexdigest()

def issue_code(user):
    now=timezone.now()
    with transaction.atomic():
        existing=EmailVerification.objects.filter(user=user).first()
        if existing and (now-existing.sent_at).total_seconds()<60:
            fail('Новый код можно запросить через минуту после предыдущего.',429)
        code=f'{secrets.randbelow(1000000):06d}'
        nonce=secrets.token_hex(16)
        EmailVerification.objects.update_or_create(user=user,defaults={'digest':code_digest(user,nonce,code),'nonce':nonce,'expires_at':now+timedelta(minutes=10),'sent_at':now,'attempts':0})
    return code

def mail(user, kind):
    verify = kind == 'verify'
    code=issue_code(user) if verify else None
    token = default_token_generator.make_token(user) if not verify else None
    fragment = urlencode({'svyaz': kind, 'uid': urlsafe_base64_encode(force_bytes(user.pk)), 'token': token}) if not verify else ''
    link = settings.SITE_URL + '/#' + fragment if not verify else None
    context = {'heading': 'Код подтверждения почты' if verify else 'Восстановление доступа', 'description': f'Привет, {user.username}! ' + ('Введи этот код в форме регистрации на MAKSON PROJECT.' if verify else 'Чтобы задать новый пароль от аккаунта MAKSON PROJECT, открой ссылку ниже.'), 'button': 'СМЕНИТЬ ПАРОЛЬ', 'link': link, 'code':code, 'expiry':'Код действует 10 минут. Никому его не сообщай.' if verify else 'Ссылка действует один час.'}
    message = EmailMultiAlternatives('MAKSON PROJECT — ' + context['heading'], context['description'] + '\n\n' + (code or link) + '\n\n'+context['expiry']+' Если это были не вы, проигнорируйте письмо.', settings.DEFAULT_FROM_EMAIL, [user.email])
    message.attach_alternative(render_to_string('chat/email.html', context), 'text/html')
    try:
        message.send(fail_silently=False)
    except Exception:
        logging.warning('SVYAZ email transport failed')
        fail('Письмо пока не отправилось. Попробуй «Отправить письмо повторно» чуть позже.', 503)

def token_user(data, generator):
    try:
        uid = urlsafe_base64_decode(data.get('uid', '')).decode()
        user = User.objects.get(pk=uid)
    except (ValueError, TypeError, OverflowError, UnicodeError, User.DoesNotExist):
        fail('Ссылка недействительна или устарела. Запроси новое письмо.')
    if not generator.check_token(user, str(data.get('token', ''))):
        fail('Ссылка недействительна или устарела. Запроси новое письмо.')
    return user

def numeric(value):
    try:
        number = int(value)
        if number < 0 or number > 2**53:
            raise ValueError()
        return number
    except (TypeError, ValueError, OverflowError):
        fail('Некорректный запрос.')

def dialog_for(user, pk):
    dialog = Dialog.objects.select_related('first', 'second').filter(Q(first=user)|Q(second=user), pk=numeric(pk)).first()
    if not dialog:
        fail('Диалог не найден.', 404)
    return dialog

def peer_of(dialog, user):
    return dialog.second if dialog.first_id == user.pk else dialog.first

def invite_json(inv):
    return {'id':inv.pk,'game':inv.game,'sender':inv.sender_id,'recipient':inv.recipient_id,'status':'expired' if inv.expires_at<=timezone.now() else inv.status}

def message_json(message):
    return {'id': message.pk, 'author': message.author_id, 'body': message.body, 'nonce': str(message.nonce), 'at': message.created_at.isoformat(), 'invite': invite_json(message.invite) if message.invite_id else None, 'photo': {'url': '/api/svyaz/photo?id='+str(message.pk), 'width': message.photo_width, 'height': message.photo_height} if message.photo else None}

def csrf_failure(request, reason=''):
    return JsonResponse({'error': 'Сессия обновилась. Обнови страницу и попробуй ещё раз.'}, status=403)

@never_cache
def endpoint(request, action):
    try:
        return dispatch(request, action)
    except ApiError as error:
        return JsonResponse({'error': error.message}, status=error.status)
    except ValidationError as error:
        return JsonResponse({'error': ' '.join(error.messages)}, status=400)

def dispatch(request, action):
    reads = social.READS | {'session', 'search', 'dialogs', 'messages', 'health', 'stats', 'photo'}
    if request.method != ('GET' if action in reads else 'POST'):
        fail('Метод не поддерживается.', 405)
    if request.method == 'POST' and action == 'send-photo':
        data = request.POST
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
        except (ValueError, UnicodeError):
            fail('Некорректный запрос.')
        if not isinstance(data, dict):
            fail('Некорректный запрос.')
    else:
        data = request.GET
    ip = request.META.get('HTTP_X_REAL_IP', request.META.get('REMOTE_ADDR', ''))
    if action in voice.ACTIONS and request.user.is_authenticated:
        limit('voice-requests', request.user.pk, 600, 60)
    else:
        limit('requests', ip, 180, 60)
    if action == 'health':
        return JsonResponse({'ok': True})
    if action == 'session':
        return JsonResponse({'user': person(request.user) if request.user.is_authenticated else None, 'csrf': get_token(request)})
    if action in ['register', 'login', 'recover', 'resend', 'verify', 'verify-code', 'reset']:
        limit('auth', ip, 25, 900)
    if action == 'register':
        limit('registration', ip, 5, 3600)
        username, email = str(data.get('username', '')).strip().lower(), str(data.get('email', '')).strip().lower()
        password = str(data.get('password', ''))
        if not re.fullmatch(r'[a-z0-9_]{3,24}', username):
            fail('Ник: 3–24 латинские буквы, цифры или подчёркивание.')
        validate_email(email)
        if len(email)>254 or len(password)>256:
            fail('Слишком длинное значение.')
        user = User(username=username, email=email, is_active=False)
        validate_password(password, user)
        if password != data.get('password2'):
            fail('Пароли не совпадают.')
        user.set_password(password)
        try:
            with transaction.atomic():
                user.save()
        except IntegrityError:
            fail('Этот ник или почта уже заняты. Войди или восстанови доступ.')
        mail(user, 'verify')
        return JsonResponse({'message': 'Код отправлен на почту. Введи шесть цифр ниже.', 'email':email}, status=201)
    if action == 'login':
        identity = str(data.get('identity', '')).strip().lower()[:254]
        limit('login', identity, 12, 900)
        found = User.objects.filter(email=identity).first() if '@' in identity else None
        user = authenticate(request, username=found.username if found else identity, password=str(data.get('password', ''))[:256])
        if not user:
            fail('Не удалось войти. Проверь ник, пароль и подтверждение почты.', 401)
        login(request, user)
        return JsonResponse({'user': person(user), 'csrf': get_token(request)})
    if action in ['recover', 'resend']:
        email = str(data.get('email', '')).strip().lower()
        validate_email(email)
        limit('mail', email, 3, 3600)
        user = User.objects.filter(email=email).first()
        if user and (action == 'recover' or not user.is_active):
            mail(user, 'reset' if user.is_active else 'verify')
        return JsonResponse({'message': 'Если такая почта зарегистрирована, письмо придёт в течение нескольких минут.'})
    if action == 'verify-code':
        email=str(data.get('email','')).strip().lower()
        code=str(data.get('code','')).strip()
        validate_email(email)
        if not re.fullmatch(r'[0-9]{6}',code):
            fail('Введи шесть цифр из письма.')
        limit('verify-code',email,15,3600)
        error=None
        with transaction.atomic():
            user=User.objects.filter(email=email,is_active=False).first()
            challenge=EmailVerification.objects.filter(user=user).first() if user else None
            if not challenge or challenge.expires_at<=timezone.now():
                error='Код недействителен или истёк. Запроси новый.'
            elif challenge.attempts>=5:
                error='Попытки закончились. Запроси новый код.'
            else:
                challenge.attempts+=1
                challenge.save(update_fields=['attempts'])
                if not constant_time_compare(challenge.digest,code_digest(user,challenge.nonce,code)):
                    error='Неверный код. Проверь письмо.' if challenge.attempts<5 else 'Попытки закончились. Запроси новый код.'
                else:
                    user.is_active=True
                    user.save(update_fields=['is_active'])
                    challenge.delete()
        if error:
            fail(error)
        return JsonResponse({'message':'Почта подтверждена. Теперь войди со своим паролем.'})
    if action == 'verify':
        user = token_user(data, confirmation_token)
        if user.is_active:
            fail('Почта уже подтверждена. Войди в аккаунт.')
        user.is_active = True
        user.save(update_fields=['is_active'])
        # Do not auto-login a pre-registered account through a forwarded email link.
        return JsonResponse({'message': 'Почта подтверждена. Теперь войди со своим паролем.'})
    if action == 'reset':
        user = token_user(data, default_token_generator)
        if not user.is_active:
            fail('Сначала подтверди почту.')
        password = str(data.get('password', ''))
        if len(password)>256 or password != data.get('password2'):
            fail('Проверь новый пароль и его повтор.')
        validate_password(password, user)
        user.set_password(password)
        user.save(update_fields=['password'])
        return JsonResponse({'message': 'Пароль изменён. Войди заново.'})
    if not request.user.is_authenticated:
        fail('Войди в аккаунт.', 401)
    user = request.user
    if not user.last_seen or (timezone.now()-user.last_seen).total_seconds()>30:
        User.objects.filter(pk=user.pk).update(last_seen=timezone.now())
    if action == 'logout':
        PushSubscription.objects.filter(user=user,session_key=request.session.session_key).delete()
        logout(request)
        return JsonResponse({'ok': True, 'csrf': get_token(request)})
    if action in social.ACTIONS:
        return social.handle(request,action,data)
    if action in {'photo', 'send-photo'}:
        from .photos import dispatch as photo_dispatch
        return photo_dispatch(request,action,data)
    if action in voice.ACTIONS:
        return voice.handle(request,action,data)
    if action == 'profile':
        name = str(data.get('name', '')).strip()
        if not 1 <= len(name) <= 40:
            fail('Имя должно быть от 1 до 40 символов.')
        user.display_name = name
        user.save(update_fields=['display_name'])
        return JsonResponse({'user': person(user)})
    if action == 'record-start':
        game, mode, key = str(data.get('game','')), str(data.get('mode','')), str(data.get('key',''))
        modes = {'asteroid': ['sprint','overdrive','chill','endless'], 'naval':['classic'], 'pulse':['classic'], 'shabash':['classic']}
        if game not in modes or mode not in modes[game] or not 1<=len(key)<=120:
            fail('Неизвестная игра или режим.')
        result = GameResult.objects.filter(user=user,game=game,run_key=key).first()
        if not result:
            limit('game-start',user.pk,120,3600)
            result,_ = GameResult.objects.get_or_create(user=user,game=game,run_key=key,defaults={'mode':mode,'network':data.get('network') is True})
        return JsonResponse({'run':result.pk})
    if action == 'record-finish':
        with transaction.atomic():
            result = GameResult.objects.filter(user=user,pk=numeric(data.get('run'))).first()
            if not result:
                fail('Партия не найдена в этом аккаунте.',404)
            if result.finished_at:
                return JsonResponse({'ok':True})
            if data.get('outcome') not in ['win','loss','draw']:
                fail('Неизвестный результат.')
            try:
                duration=float(data.get('duration',0))
            except (TypeError,ValueError,OverflowError):
                fail('Некорректная длительность.')
            if not math.isfinite(duration) or not 0<=duration<=86400:
                fail('Некорректная длительность.')
            result.outcome=data['outcome']
            result.duration=duration
            result.score=min(numeric(data.get('score',0)),100000000)
            result.distance=min(numeric(data.get('distance',0)),100000000)
            result.rounds=min(numeric(data.get('rounds',0)),10000)
            result.completed=data.get('completed') is True
            result.finished_at=timezone.now()
            result.save()
        return JsonResponse({'ok':True})
    if action == 'stats':
        rows=GameResult.objects.filter(user=user,finished_at__isnull=False)
        totals=list(rows.values('game','mode','network').annotate(played=Count('pk'),wins=Count('pk',filter=Q(outcome='win')),losses=Count('pk',filter=Q(outcome='loss')),bestTime=Min('duration',filter=Q(completed=True,duration__gt=0)),longest=Max('duration'),bestScore=Max('score'),distance=Max('distance'),maxRounds=Max('rounds')))
        recent=rows.order_by('-pk')
        if data.get('before'):
            recent=recent.filter(pk__lt=numeric(data['before'])).order_by('-pk')
        return JsonResponse({'totals':totals,'recent':list(recent.values('id','game','mode','network','outcome','duration','score','distance','rounds','finished_at')[:30])})
    if action == 'search':
        query = str(data.get('q', '')).strip().lower()[:24]
        users = User.objects.filter(is_active=True, username__startswith=query).exclude(pk=user.pk)[:20] if len(query)>=2 else []
        return JsonResponse({'users': [person(u) for u in users]})
    if action == 'dialogs':
        last = Message.objects.filter(dialog=OuterRef('pk')).order_by('-id')
        dialogs = Dialog.objects.filter(Q(first=user)|Q(second=user)).select_related('first', 'second').annotate(last_body=Subquery(last.values('body')[:1]), last_photo=Subquery(last.values('photo')[:1]), last_at=Subquery(last.values('created_at')[:1]), unread=Count('messages', filter=~Q(messages__author=user)&(Q(first=user,messages__id__gt=F('first_read'))|Q(second=user,messages__id__gt=F('second_read'))))).order_by('-updated_at')[:100]
        return JsonResponse({'dialogs': [{'id': d.pk, 'peer': person(peer_of(d,user)), 'last': (('ФОТО · ' if d.last_photo else '')+(d.last_body or ''))[:120], 'at': d.last_at.isoformat() if d.last_at else None, 'unread': d.unread} for d in dialogs]})
    if action == 'open':
        peer = User.objects.filter(pk=numeric(data.get('user')), is_active=True).exclude(pk=user.pk).first()
        if not peer:
            fail('Пользователь не найден.', 404)
        first, second = sorted([user.pk, peer.pk])
        dialog = Dialog.objects.filter(first_id=first, second_id=second).first()
        if not dialog:
            if Block.objects.filter(owner=peer, target=user).exists():
                fail('Переписка с этим пользователем недоступна.', 403)
            limit('open', user.pk, 30, 3600)
            dialog, _ = Dialog.objects.get_or_create(first_id=first, second_id=second)
        return JsonResponse({'dialog': dialog.pk, 'peer': person(peer)})
    if action in ['messages', 'send', 'read', 'block']:
        dialog = dialog_for(user, data.get('dialog'))
        peer = peer_of(dialog, user)
        if action == 'messages':
            query = dialog.messages.select_related('invite').all()
            if data.get('before'):
                query = query.filter(pk__lt=numeric(data['before']))
            if data.get('after'):
                messages = list(query.filter(pk__gt=numeric(data['after'])).order_by('id')[:51])
                more = len(messages)>50
                messages = messages[:50]
            else:
                messages = list(query.order_by('-id')[:51])
                more = len(messages)>50
                messages = list(reversed(messages[:50]))
            return JsonResponse({'invites': [invite_json(i) for i in GameInvite.objects.filter(chat_messages__dialog=dialog).order_by('-pk')[:100]], 'messages': [message_json(m) for m in messages], 'more': more, 'peer': person(peer), 'peerRead': dialog.second_read if dialog.first_id==user.pk else dialog.first_read, 'blocked': Block.objects.filter(owner=user,target=peer).exists()})
        if action == 'read':
            seen = numeric(data.get('last'))
            if seen and not dialog.messages.filter(pk=seen).exists():
                fail('Сообщение не найдено.',404)
            field = 'first_read' if dialog.first_id==user.pk else 'second_read'
            Dialog.objects.filter(pk=dialog.pk, **{field+'__lt':seen}).update(**{field:seen})
            if not dialog.messages.exclude(author=user).filter(pk__gt=seen).exists(): Notification.objects.filter(recipient=user,kind='message',target=dialog.pk).update(read=True)
            return JsonResponse({'ok':True})
        if action == 'block':
            if data.get('blocked') is True:
                Block.objects.get_or_create(owner=user,target=peer)
                first,second=sorted([user.pk,peer.pk])
                Friendship.objects.filter(first_id=first,second_id=second).delete()
                GameInvite.objects.filter(Q(sender=user,recipient=peer)|Q(sender=peer,recipient=user),status='pending').update(status='cancelled')
                Notification.objects.filter(Q(recipient=user,actor=peer)|Q(recipient=peer,actor=user)).update(read=True)
            else:
                Block.objects.filter(owner=user,target=peer).delete()
            return JsonResponse({'ok':True})
        limit('messages',user.pk,30,60)
        text = str(data.get('body','')).strip()
        if not 1<=len(text)<=4000:
            fail('Сообщение: от 1 до 4000 символов.')
        try:
            nonce=uuid.UUID(str(data.get('nonce','')))
        except ValueError:
            fail('Некорректный номер сообщения.')
        with transaction.atomic():
            if Block.objects.filter(Q(owner=user,target=peer)|Q(owner=peer,target=user)).exists():
                fail('Переписка заблокирована.',403)
            message,created=Message.objects.get_or_create(author=user,nonce=nonce,defaults={'dialog':dialog,'body':text})
            if message.dialog_id!=dialog.pk or message.body!=text:
                fail('Номер сообщения уже использован.',409)
            if created:
                social.notify(peer,user,'message',dialog.pk)
                Dialog.objects.filter(pk=dialog.pk).update(updated_at=message.created_at)
        return JsonResponse({'message':message_json(message)},status=201 if created else 200)
    fail('Неизвестная команда.',404)
