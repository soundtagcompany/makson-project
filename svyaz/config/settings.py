import json
import os
from pathlib import Path
from urllib.parse import urlsplit

BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG = json.loads(Path(os.environ['SVYAZ_CONFIG']).read_text()) if os.environ.get('SVYAZ_CONFIG') else {}
DEBUG = os.environ.get('SVYAZ_DEV') == '1'
SECRET_KEY = CONFIG.get('SECRET_KEY') or os.environ.get('SVYAZ_SECRET')
if not SECRET_KEY:
    raise RuntimeError('Set SVYAZ_CONFIG or SVYAZ_SECRET; secrets are not stored in source.')
ALLOWED_HOSTS = ['makson.sndtag.ru', 'localhost', '127.0.0.1', 'testserver']
SITE_URL = CONFIG.get('SITE_URL', 'http://localhost:4173' if DEBUG else 'https://makson.sndtag.ru')
SITE_ORIGIN = urlsplit(SITE_URL)
if SITE_ORIGIN.hostname and SITE_ORIGIN.hostname not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(SITE_ORIGIN.hostname)
INSTALLED_APPS = ['django.contrib.auth', 'django.contrib.contenttypes', 'django.contrib.sessions', 'chat']
MIDDLEWARE = ['django.middleware.security.SecurityMiddleware', 'django.contrib.sessions.middleware.SessionMiddleware', 'django.middleware.common.CommonMiddleware', 'django.middleware.csrf.CsrfViewMiddleware', 'django.contrib.auth.middleware.AuthenticationMiddleware']
ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'
AUTH_USER_MODEL = 'chat.User'
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': CONFIG.get('DATABASE_PATH', str(BASE_DIR / 'data' / 'svyaz.sqlite3')), 'OPTIONS': {'timeout': 20, 'transaction_mode': 'IMMEDIATE'}}}
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
LANGUAGE_CODE = 'ru'
TIME_ZONE = 'UTC'
USE_TZ = True
TEMPLATES = [{'BACKEND': 'django.template.backends.django.DjangoTemplates', 'APP_DIRS': True}]
AUTH_PASSWORD_VALIDATORS = [{'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'}, {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 10}}, {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'}, {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'}]
SESSION_COOKIE_NAME = 'svyaz_session'
CSRF_COOKIE_NAME = 'svyaz_csrf'
SESSION_COOKIE_SECURE = CSRF_COOKIE_SECURE = SITE_ORIGIN.scheme == 'https'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = CSRF_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_AGE = 60 * 60 * 24 * 30
CSRF_TRUSTED_ORIGINS = [SITE_URL]
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'no-referrer'
CSRF_FAILURE_VIEW = 'chat.views.csrf_failure'
DATA_UPLOAD_MAX_MEMORY_SIZE = 16384
FILE_UPLOAD_MAX_MEMORY_SIZE = 512 * 1024
DATA_UPLOAD_MAX_NUMBER_FILES = 1
SVYAZ_PHOTO_ROOT = CONFIG.get('PHOTO_ROOT', str(Path(DATABASES['default']['NAME']).parent / 'photos'))
PASSWORD_RESET_TIMEOUT = 3600
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend' if DEBUG else 'django.core.mail.backends.smtp.EmailBackend'
for key in ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_HOST_USER', 'EMAIL_HOST_PASSWORD', 'EMAIL_USE_SSL', 'EMAIL_USE_TLS']:
    if key in CONFIG:
        globals()[key] = CONFIG[key]
if CONFIG.get('EMAIL_FILE_PATH'):
    EMAIL_BACKEND = 'django.core.mail.backends.filebased.EmailBackend'
    EMAIL_FILE_PATH = CONFIG['EMAIL_FILE_PATH']
EMAIL_TIMEOUT = 12
DEFAULT_FROM_EMAIL = CONFIG.get('DEFAULT_FROM_EMAIL', 'MAKSON PROJECT <info@sndtag.ru>')
LOGGING = {'version': 1, 'disable_existing_loggers': False, 'handlers': {'console': {'class': 'logging.StreamHandler'}}, 'root': {'handlers': ['console'], 'level': 'WARNING'}}
