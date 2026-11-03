
from pathlib import Path
import os
import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
# Load backend/.env next to this file — not the process CWD (fragile when
# manage.py runs from the repo root). Real env vars still win on Render.
load_dotenv(BASE_DIR / '.env')


def _required(name):
    value = os.environ.get(name)
    if not value:
        raise ImproperlyConfigured(
            f"{name} must be set (backend/.env locally, environment on Render)."
        )
    return value


def _env_list(name):
    return [h.strip() for h in os.environ.get(name, '').split(',') if h.strip()]


DATABASES = {
    'default': dj_database_url.config(
        default=_required('DATABASE_URL'),
        conn_max_age=600,
    )
}
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STORAGES = {
    "default": {
        "BACKEND": "soul.supabase_storage.SupabaseStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')
SUPABASE_BUCKET_NAME = os.environ.get('SUPABASE_BUCKET_NAME', 'media')


MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MEDIA_URL = '/media/'

SECRET_KEY = _required('DJANGO_SECRET_KEY')

# Local prod-mode runs set DJANGO_DEBUG=1; anything else is prod behaviour.
DEBUG = os.environ.get('DJANGO_DEBUG', 'False').lower() in ('1', 'true', 'yes')

ALLOWED_HOSTS = [
    'portfolio-79vi.onrender.com',
    # Legacy production host for the Jibunai repo (kept so the swapped
    # backend still serves the old Render service during migration).
    'jibunai.onrender.com',
    'archana-timilsina.com.np',
    'www.archana-timilsina.com.np',
    'localhost',
    '127.0.0.1',
    # Android emulator sends Host: 10.0.2.2 when talking to the host machine.
    '10.0.2.2',
] + _env_list('ALLOWED_HOSTS_EXTRA')

# DEBUG is False so Django enforces the allowlist strictly. Add your LAN IP here
# (or to ALLOWED_HOSTS) when running against a physical device on the same Wi-Fi.
CSRF_TRUSTED_ORIGINS = [
    'https://archana-timilsina.com.np',
    'https://www.archana-timilsina.com.np',
    'https://portfolio-79vi.onrender.com',
    'https://jibunai.onrender.com',
    'http://localhost:3000',
    'http://localhost:8000',
    'http://10.0.2.2:8000',
    'http://10.0.2.2:3000',
] + _env_list('CSRF_EXTRA_ORIGINS')

CORS_ALLOWED_ORIGINS = [
    "https://archana-timilsina.com.np",
    "https://www.archana-timilsina.com.np",
    # Legacy production frontend for the Jibunai repo.
    "https://jibunai.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:5174",
    "http://localhost:4174",
    "http://10.0.2.2:5173",
    "http://10.0.2.2:5174",
    "http://10.0.2.2:3000",
] + _env_list('CORS_EXTRA_ORIGINS')

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://[a-z0-9-]*-archanatimilsinas-projects\.vercel\.app$",
    r"^https://portfolio-[a-z0-9-]+\.vercel\.app$",
    r"^https://jibunai(-[a-z0-9-]+)?\.vercel\.app$",
]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
     'corsheaders'
]
EXTERNAL_APPS =[
    'api'
]
INSTALLED_APPS += EXTERNAL_APPS

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'soul.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'soul.wsgi.application'


AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


LANGUAGE_CODE = 'en-us'

# Owner + users are in Asia/Kathmandu — challenge windows use localdate().
TIME_ZONE = 'Asia/Kathmandu'

USE_I18N = True

USE_TZ = True


# Hardened when serving real traffic (Render sets TLS + X-Forwarded-Proto).
# Local prod-mode test: SECURE_SSL_REDIRECT=0 python manage.py runserver.
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'True').lower() in ('1', 'true', 'yes')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True


REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    # Reads stay open (public site + logged-out screens); writes need a Bearer
    # token (mobile attaches it once logged in; web uses VITE_API_TOKEN).
    # JibunaiTokenAuthentication identifies those sessions.
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'api.authentication.JibunaiTokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    # Abuse brake only: 5000 req/hour/IP is far above normal app use
    # (cache revalidates every 45 s) but stops runaway upload/like spam.
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '5000/hour',
        'user': '20000/hour',
        # Brute-force brake: secrets are short, so guessable endpoints
        # get tight per-IP budgets. Normal use is a handful of tries.
        'verify': '30/hour',
        'auth': '60/hour',
    },
}
