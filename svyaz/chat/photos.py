"""Private, re-encoded images. No public media directory or client filenames."""
import hashlib
import io
import uuid
import warnings
from pathlib import Path
from PIL import Image, ImageOps, UnidentifiedImageError
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.http import FileResponse, JsonResponse
from .models import Message, Block, Dialog

def dispatch(request, action, data):
    from .views import fail, limit, numeric, dialog_for, peer_of, message_json
    from .social import notify
    user = request.user
    folder = Path(settings.SVYAZ_PHOTO_ROOT)
    if action == 'photo':
        message = Message.objects.filter(pk=numeric(data.get('id'))).filter(
            Q(dialog__first=user) | Q(dialog__second=user)).first()
        if not message or not message.photo:
            fail('Фото не найдено.', 404)
        try:
            file = (folder / message.photo).open('rb')
        except FileNotFoundError:
            fail('Фото не найдено.', 404)
        response = FileResponse(file, content_type='image/jpeg')
        response['Cache-Control'] = 'private, no-store'
        response['Content-Disposition'] = 'inline; filename="photo.jpg"'
        response['X-Content-Type-Options'] = 'nosniff'
        return response

    dialog = dialog_for(user, data.get('dialog'))
    peer = peer_of(dialog, user)
    if Block.objects.filter(Q(owner=user,target=peer)|Q(owner=peer,target=user)).exists():
        fail('Переписка заблокирована.',403)
    limit('photos',user.pk,30,3600)
    text = str(data.get('body','')).strip()
    if len(text)>4000:
        fail('Подпись: не более 4000 символов.')
    try:
        nonce = uuid.UUID(str(data.get('nonce','')))
    except ValueError:
        fail('Некорректный номер сообщения.')
    upload = request.FILES.get('photo')
    if not upload or not 0 < upload.size <= 12*1024*1024:
        fail('Выбери фото до 12 МБ.')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(upload) as image:
                if image.format not in {'JPEG','PNG','WEBP','GIF'} or image.width*image.height>24000000:
                    fail('Нужен JPG, PNG или WebP до 24 мегапикселей.')
                image.seek(0)
                image = ImageOps.exif_transpose(image)
                image.thumbnail((1920,1920))
                if image.mode in ('RGBA','LA','P'):
                    rgba=image.convert('RGBA'); clean=Image.new('RGB',image.size,'white');clean.paste(rgba,mask=rgba.getchannel('A'))
                else:
                    clean=image.convert('RGB')
                output=io.BytesIO();clean.save(output,'JPEG',quality=85,optimize=True)
                width,height=clean.size
    except (UnidentifiedImageError,OSError,ValueError,Image.DecompressionBombError,Image.DecompressionBombWarning):
        fail('Не удалось прочитать фото. Попробуй JPG, PNG или WebP.')
    payload=output.getvalue();digest=hashlib.sha256(payload).hexdigest()
    saved=None
    try:
        with transaction.atomic():
            if Block.objects.filter(Q(owner=user,target=peer)|Q(owner=peer,target=user)).exists():
                fail('Переписка заблокирована.',403)
            old=Message.objects.filter(author=user,nonce=nonce).first()
            if old:
                if old.dialog_id!=dialog.pk or old.body!=text or old.photo_digest!=digest:
                    fail('Номер сообщения уже использован.',409)
                return JsonResponse({'message':message_json(old)})
            folder.mkdir(parents=True,exist_ok=True)
            filename=uuid.uuid4().hex+'.jpg';saved=folder/filename
            with saved.open('xb') as file:file.write(payload)
            message=Message.objects.create(dialog=dialog,author=user,body=text,nonce=nonce,photo=filename,photo_width=width,photo_height=height,photo_digest=digest)
            notify(peer,user,'message',dialog.pk)
            Dialog.objects.filter(pk=dialog.pk).update(updated_at=message.created_at)
    except Exception:
        if saved:saved.unlink(missing_ok=True)
        raise
    return JsonResponse({'message':message_json(message)},status=201)
