# backend/trend_twist_api/settings.py

import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv # Used to load secrets from .env file

# Load environment variables from .env
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent



# --- SECURITY & CORE ---
# Set DEBUG to False in production
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-fallback-key-for-local-dev-only')

# Set DEBUG to False in production
DEBUG = 'RENDER' not in os.environ

# Allow all hosts in production (Render sets this dynamically) (or use '*')
ALLOWED_HOSTS = ['*']

# --- Application definition ---

INSTALLED_APPS = [
    'daphne', # ASGI server (required to run channels)
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'channels', # Django Channels
    
    # 3rd Party Apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',

    # Our Custom App
    'trend', 
    'storages', # Supabase/S3 Storage 
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    "whitenoise.middleware.WhiteNoiseMiddleware", # Added for Static Files
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware', 
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# ... (ASGI/Channel Layers remain same, possibly switch to Redis for prod later but User insisted on free SQLite/In-memory for now)

# --- CORS Configuration ---
# Allow all for now or specific Vercel domains
CORS_ALLOW_ALL_ORIGINS = True # Easier for initial setup
CSRF_TRUSTED_ORIGINS = ['https://*.onrender.com', 'https://*.vercel.app']

ROOT_URLCONF = 'trend_twist_api.urls'

# ... (Templates/WSGI/Databases remain same)

# --- Static/Media Files ---


MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# ... (Rest of file)

# --- ASGI Configuration (NEW) ---
# ASGI is now the primary entry point for HTTP and WebSocket
ASGI_APPLICATION = 'trend_twist_api.asgi.application' 

# --- Channel Layers (REQUIRED FOR LIVE CHAT) ---
# Using InMemoryChannelLayer for Development (No Redis required)
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer"
    }
}
# CHANNEL_LAYERS = {
#     'default': {
#         'BACKEND': 'channels_redis.pubsub.RedisPubSubChannelLayer',
#         'CONFIG': {
#             "hosts": [('127.0.0.1', 6379)], # Assumes Redis is running on default port
#         },
#     },
# }

# --- CORS Configuration ---
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://trend-twist.vercel.app",
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


# --- Database (MYSQL for XAMPP) ---
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3', # આ BASE_DIR માં db.sqlite3 નામની ફાઈલ બનાવશે
    }
}


# --- Password validation (No change) ---
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',},
]

# --- Internationalization (No change) ---
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# --- Static/Media Files ---
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')


# Default STORAGES (Local/Filesystem)
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Supabase Storage (S3 Compatible) - PRODUCTION OVERRIDE
if 'SUPABASE_ACCESS_KEY_ID' in os.environ:
    AWS_ACCESS_KEY_ID = os.environ.get('SUPABASE_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('SUPABASE_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('SUPABASE_STORAGE_BUCKET_NAME')
    AWS_S3_ENDPOINT_URL = os.environ.get('SUPABASE_S3_ENDPOINT_URL')
    AWS_S3_REGION_NAME = 'us-east-1'
    
    # S3 Config
    AWS_DEFAULT_ACL = 'public-read'
    AWS_S3_FILE_OVERWRITE = False
    AWS_QUERYSTRING_AUTH = False
    AWS_S3_OBJECT_PARAMETERS = {'CacheControl': 'max-age=86400'}
    
    # Handle Bucket Name with Spaces for URL
    from urllib.parse import quote, urlparse
    _bucket_name = AWS_STORAGE_BUCKET_NAME
    _bucket_name_url = quote(_bucket_name) # Encodes "trend twist" -> "trend%20twist"
    
    _s3_endpoint = urlparse(AWS_S3_ENDPOINT_URL)
    _s3_domain = _s3_endpoint.netloc 
    AWS_S3_CUSTOM_DOMAIN = f"{_s3_domain}/storage/v1/object/public/{_bucket_name_url}"
    
    # Update STORAGES for Django 5.0+
    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        "OPTIONS": {
            "access_key": AWS_ACCESS_KEY_ID,
            "secret_key": AWS_SECRET_ACCESS_KEY,
            "bucket_name": AWS_STORAGE_BUCKET_NAME,
            "endpoint_url": AWS_S3_ENDPOINT_URL,
            "region_name": AWS_S3_REGION_NAME,
            "default_acl": AWS_DEFAULT_ACL,
            "file_overwrite": AWS_S3_FILE_OVERWRITE,
            "querystring_auth": AWS_QUERYSTRING_AUTH,
            "object_parameters": AWS_S3_OBJECT_PARAMETERS,
            "custom_domain": AWS_S3_CUSTOM_DOMAIN,
        }
    }
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'

# --- DRF / JWT (UPDATED for ROTATION FIX) ---
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    )
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True, # CRITICAL FIX for session persistence
    'BLACKLIST_AFTER_ROTATION': True, 
}

# --- Celery & Redis Configuration (Used by Channels) ---
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'

# --- Default primary key (No change) ---
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --- Email Configuration (Loads from .env) ---
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 465
EMAIL_USE_TLS = False
EMAIL_USE_SSL = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER