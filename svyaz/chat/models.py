import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower

class User(AbstractUser):
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=40, blank=True)
    last_seen = models.DateTimeField(null=True)

    class Meta:
        constraints = [models.UniqueConstraint(Lower('username'), name='svyaz_username_lower'), models.UniqueConstraint(Lower('email'), name='svyaz_email_lower')]

class EmailVerification(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    digest = models.CharField(max_length=64)
    nonce = models.CharField(max_length=32)
    expires_at = models.DateTimeField()
    sent_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)

class Dialog(models.Model):
    first = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dialogs_first')
    second = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dialogs_second')
    first_read = models.PositiveBigIntegerField(default=0)
    second_read = models.PositiveBigIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['first', 'second'], name='svyaz_pair'), models.CheckConstraint(condition=models.Q(first__lt=models.F('second')), name='svyaz_sorted_pair')]

class Message(models.Model):
    dialog = models.ForeignKey(Dialog, on_delete=models.CASCADE, related_name='messages')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    body = models.TextField(max_length=4000)
    photo = models.CharField(max_length=80, blank=True)
    photo_width = models.PositiveSmallIntegerField(default=0)
    photo_height = models.PositiveSmallIntegerField(default=0)
    photo_digest = models.CharField(max_length=64, blank=True)
    invite = models.ForeignKey('GameInvite', null=True, blank=True, on_delete=models.SET_NULL, related_name='chat_messages')
    nonce = models.UUIDField(default=uuid.uuid4)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['author', 'nonce'], name='svyaz_message_nonce')]
        indexes = [models.Index(fields=['dialog', 'id'])]

class Block(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocks')
    target = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_by')

    class Meta:
        constraints = [models.UniqueConstraint(fields=['owner', 'target'], name='svyaz_block_pair')]

class GameResult(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='game_results')
    game = models.CharField(max_length=16)
    mode = models.CharField(max_length=16)
    network = models.BooleanField(default=False)
    run_key = models.CharField(max_length=120)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True)
    outcome = models.CharField(max_length=12, blank=True)
    duration = models.FloatField(default=0)
    score = models.PositiveIntegerField(default=0)
    distance = models.PositiveIntegerField(default=0)
    rounds = models.PositiveIntegerField(default=0)
    completed = models.BooleanField(default=False)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['user','game','run_key'],name='makson_result_once')]
        indexes = [models.Index(fields=['user','finished_at'])]

class Friendship(models.Model):
    first = models.ForeignKey(User,on_delete=models.CASCADE,related_name='+')
    second = models.ForeignKey(User,on_delete=models.CASCADE,related_name='+')
    requester = models.ForeignKey(User,on_delete=models.CASCADE,related_name='+')
    accepted = models.BooleanField(default=False)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['first','second'],name='friend_pair'),models.CheckConstraint(condition=models.Q(first__lt=models.F('second')),name='friend_sorted')]

class GameInvite(models.Model):
    sender = models.ForeignKey(User,on_delete=models.CASCADE,related_name='+')
    recipient = models.ForeignKey(User,on_delete=models.CASCADE,related_name='+')
    game = models.CharField(max_length=16)
    code = models.CharField(max_length=4)
    room_id = models.CharField(max_length=40)
    expires_at = models.DateTimeField()
    status = models.CharField(max_length=12,default='pending')

class Notification(models.Model):
    recipient = models.ForeignKey(User,on_delete=models.CASCADE,related_name='+')
    actor = models.ForeignKey(User,on_delete=models.CASCADE,related_name='+')
    kind = models.CharField(max_length=16)
    target = models.PositiveBigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)
    pushed = models.BooleanField(default=False)
    push_attempts = models.PositiveSmallIntegerField(default=0)
    class Meta:
        indexes = [models.Index(fields=['recipient','read','id'])]

class PushSubscription(models.Model):
    user = models.ForeignKey(User,on_delete=models.CASCADE,related_name='+')
    endpoint = models.CharField(max_length=2048,unique=True)
    keys = models.JSONField()
    session_key = models.CharField(max_length=40)

class VoiceCall(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True)

class VoiceMember(models.Model):
    call = models.ForeignKey(VoiceCall, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='+')
    state = models.CharField(max_length=12, default='invited')
    session = models.UUIDField(default=uuid.uuid4)
    last_seen = models.DateTimeField()
    muted = models.BooleanField(default=False)
    deafened = models.BooleanField(default=False)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['call','user'], name='voice_member_pair')]
        indexes = [models.Index(fields=['user','state'])]

class VoiceSignal(models.Model):
    call = models.ForeignKey(VoiceCall, on_delete=models.CASCADE, related_name='+')
    sender = models.ForeignKey(VoiceMember, on_delete=models.CASCADE, related_name='+')
    recipient = models.ForeignKey(VoiceMember, on_delete=models.CASCADE, related_name='+')
    sender_session = models.UUIDField()
    recipient_session = models.UUIDField()
    payload = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        indexes = [models.Index(fields=['recipient','id'])]
