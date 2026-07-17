import os
from pathlib import Path
from decouple import config, Csv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/

SECRET_KEY = config('DJANGO_SECRET_KEY', default='django-insecure-development-secret-key-12345')

DEBUG = config('DJANGO_DEBUG', default=False, cast=bool)

if not DEBUG and (not SECRET_KEY or SECRET_KEY == 'django-insecure-development-secret-key-12345'):
    from django.core.exceptions import ImproperlyConfigured
    raise ImproperlyConfigured("DJANGO_SECRET_KEY is not configured or is set to insecure default in production.")

ALLOWED_HOSTS = config('DJANGO_ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'drf_spectacular',
    'corsheaders',
    
    # Local apps
    'dies',
    'machines',
    'history',
    'users',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'users.middleware.CurrentUserMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# We will implement custom session/JWT middleware in Phase 8
# Let's keep a placeholder or just standard middleware for now

ROOT_URLCONF = 'dms.urls'

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

WSGI_APPLICATION = 'dms.wsgi.application'

# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('POSTGRES_DB', default='dms'),
        'USER': config('POSTGRES_USER', default='dms_user'),
        'PASSWORD': config('POSTGRES_PASSWORD', default='dms_pass_password'),
        'HOST': config('POSTGRES_HOST', default='db'),
        'PORT': config('POSTGRES_PORT', default='5432', cast=int),
        'CONN_MAX_AGE': config('DATABASE_CONN_MAX_AGE', default=300, cast=int),  # 5 minutes
        'OPTIONS': {
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000',  # 30 second query timeout
        },
        'ATOMIC_REQUESTS': False,  # Wrap request in transaction
    }
}

# Password validation
# https://docs.djangoproject.com/en/4.2/ref/settings/#auth-password-validators

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

# Internationalization
# https://docs.djangoproject.com/en/4.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.2/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS Settings
CORS_ALLOW_ALL_ORIGINS = config('CORS_ALLOW_ALL_ORIGINS', default=False, cast=bool)
if not CORS_ALLOW_ALL_ORIGINS:
    CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='', cast=Csv())

# REST Framework Settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'users.authentication.CustomJWTAuthentication',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '10000/hour',
    }
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'DMS API',
    'DESCRIPTION': 'DMS Django REST API for dies, machines, users, backups, and real-time events.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# Simple JWT Settings
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=12),  # Absolute timeout is 12h
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Session Settings
SESSION_IDLE_TIMEOUT_MINUTES = config('SESSION_IDLE_TIMEOUT_MINUTES', default=30, cast=int)
SESSION_ABSOLUTE_TIMEOUT_HOURS = config('SESSION_ABSOLUTE_TIMEOUT_HOURS', default=12, cast=int)

# Meilisearch configuration
MEILI_HOST = config('MEILI_HOST', default='http://meilisearch:7700')
MEILI_MASTER_KEY = config('MEILI_MASTER_KEY', default='change_me')
INTERNAL_API_SECRET = config('INTERNAL_API_SECRET')

# Custom user model with role (will implement in users app)
AUTH_USER_MODEL = 'users.User'

ROOT_USERNAME = config('ROOT_USERNAME', default='root')
ROOT_PASSWORD = config('ROOT_PASSWORD', default='root123')

# Caching with Redis (Django 4.0+)
REDIS_PASSWORD = config('REDIS_PASSWORD', default='')
REDIS_CACHE_URL = config('REDIS_CACHE_URL', default=f'redis://:{REDIS_PASSWORD}@redis:6379/0' if REDIS_PASSWORD else 'redis://redis:6379/0')
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': REDIS_CACHE_URL,
    }
}

# Celery Configuration
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default=f'redis://:{REDIS_PASSWORD}@redis:6379/1' if REDIS_PASSWORD else 'redis://redis:6379/1')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default=f'redis://:{REDIS_PASSWORD}@redis:6379/1' if REDIS_PASSWORD else 'redis://redis:6379/1')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# Celery Beat Schedule
CELERY_BEAT_SCHEDULE = {
    'auto-prune-history-daily': {
        'task': 'history.tasks.auto_prune_history',
        'schedule': 86400.0, # Every 24 hours
    },
}

import sys
CELERY_TASK_ALWAYS_EAGER = 'test' in sys.argv
CELERY_TASK_EAGER_PROPAGATES = CELERY_TASK_ALWAYS_EAGER

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'dms.logging.JsonFormatter',
        },
        'console': {
            'format': '[{levelname}] {name}: {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': config('LOG_FORMAT', default='json'),
        },
    },
    'root': {
        'handlers': ['console'],
        'level': config('LOG_LEVEL', default='INFO'),
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': config('DJANGO_LOG_LEVEL', default='INFO'),
            'propagate': False,
        },
        'celery': {
            'handlers': ['console'],
            'level': config('CELERY_LOG_LEVEL', default='INFO'),
            'propagate': False,
        },
    },
}

HISTORY_RETENTION_DAYS = config('HISTORY_RETENTION_DAYS', default=365, cast=int)
SESSION_MAX_CONCURRENT = config('SESSION_MAX_CONCURRENT', default=3, cast=int)

from django.core.exceptions import ImproperlyConfigured
if not DEBUG:
    if SECRET_KEY == 'django-insecure-development-secret-key-12345':
        raise ImproperlyConfigured("Insecure DJANGO_SECRET_KEY detected in production!")
    if not MEILI_MASTER_KEY or len(MEILI_MASTER_KEY) < 16 or MEILI_MASTER_KEY in ('meili_secret_key', 'change_me'):
        raise ImproperlyConfigured("Insecure MEILI_MASTER_KEY detected in production!")
    if not INTERNAL_API_SECRET or len(INTERNAL_API_SECRET) < 16 or INTERNAL_API_SECRET in ('dms_internal_secret_default_key_998', 'your-internal-secret'):
        raise ImproperlyConfigured("Insecure INTERNAL_API_SECRET detected in production!")
    db_pass = DATABASES['default']['PASSWORD']
    if not db_pass or len(db_pass) < 16 or db_pass in ('db_secret_password', 'password', 'postgres', 'dms_pass_password'):
        raise ImproperlyConfigured("Insecure POSTGRES_PASSWORD detected in production!")
