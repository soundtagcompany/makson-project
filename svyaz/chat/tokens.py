# Adapted from sndtag.ru: inactive accounts + email confirmation tokens.
# Include password/email and separate the signing namespace from password reset.
from django.contrib.auth.tokens import PasswordResetTokenGenerator

class EmailConfirmationTokenGenerator(PasswordResetTokenGenerator):
    key_salt = 'svyaz.email.confirmation'

    def _make_hash_value(self, user, timestamp):
        return f'{user.pk}{timestamp}{user.is_active}{user.email}{user.password}'

confirmation_token = EmailConfirmationTokenGenerator()
