# backend/trend_twist_api/settings.py

import os
from pathlib import Path
from datetime import timedelta
import dj_database_url
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# --- SECURITY ---
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-prod-key-change-me')
DEBUG = 'RENDER' not in os.environ
ALLOWED_HOSTS = ['*']

# --- APPS ---
INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'channels',
    
    # 3rd Party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'storages', 

    # Project App
    'trend', 
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    "whitenoise.middleware.WhiteNoiseMiddleware",
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware', 
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'trend_twist_api.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'trend_twist_api.wsgi.application'
ASGI_APPLICATION = 'trend_twist_api.asgi.application'

# --- DATABASE (NEON POSTGRESQL PRODUCTION) ---
# Goal: Performance, Scalability & Standard DevOps best-practices.
if 'RENDER' in os.environ:
    DATABASES = {
        'default': dj_database_url.parse(
            os.environ.get("DATABASE_URL"),
            conn_max_age=60, # Persistent connections (reduces handshake latency)
            ssl_require=True
        )
    }
else:
    # 2. LOCAL SQLite (Fallback) / Manual .env connection
    DATABASES = {
        'default': dj_database_url.config(
            default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',
            conn_max_age=600
        )
    }

# --- REDIS, CACHING & CHANNELS (UPSTASH OPTIMIZED) ---
# Use 'rediss://' for TLS connections (required for Upstash with --tls)
REDIS_URL = os.environ.get('REDIS_URL')

if REDIS_URL:
    # Ensure protocol is rediss:// if we want TLS
    if REDIS_URL.startswith('redis://') and ('upstash.io' in REDIS_URL):
        REDIS_URL = REDIS_URL.replace('redis://', 'rediss://', 1)

    # 1. CHANNEL LAYERS (WebSocket communication)
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                "hosts": [REDIS_URL],
                "symmetric_encryption_keys": [SECRET_KEY], # Optional security
            },
        },
    }
    # 2. CACHE (Distributed matchmaking & global state)
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                "CONNECTION_POOL_KWARGS": {
                    "max_connections": 100,
                    "retry_on_timeout": True,
                },
            }
        }
    }
else:
    CHANNEL_LAYERS = {'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}}
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}


# --- AUTH & JWT ---
AUTH_PASSWORD_VALIDATORS = [{'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'}]
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True, 
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ('rest_framework_simplejwt.authentication.JWTAuthentication',),
    'DEFAULT_PERMISSION_CLASSES': ('trend.permissions.IsNotBlocked', 'rest_framework.permissions.IsAuthenticated',),
}

# --- ASSETS ---
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Production Cloud Storage (Supabase/S3)
if 'SUPABASE_ACCESS_KEY_ID' in os.environ:
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
            "OPTIONS": {
                "access_key": os.environ.get('SUPABASE_ACCESS_KEY_ID'),
                "secret_key": os.environ.get('SUPABASE_SECRET_ACCESS_KEY'),
                "bucket_name": os.environ.get('SUPABASE_STORAGE_BUCKET_NAME'),
                "endpoint_url": os.environ.get('SUPABASE_S3_ENDPOINT_URL'),
                "region_name": 'us-east-1',
                "default_acl": 'public-read',
                "querystring_auth": False,
            }
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }

CORS_ALLOW_ALL_ORIGINS = True
CSRF_TRUSTED_ORIGINS = ['https://*.onrender.com', 'https://*.vercel.app']
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
