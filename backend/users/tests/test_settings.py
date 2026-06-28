import os
import importlib
from django.test import SimpleTestCase
from django.core.exceptions import ImproperlyConfigured
import dms.settings

class SettingsStartupValidationTest(SimpleTestCase):
    def setUp(self):
        self.original_env = dict(os.environ)

    def tearDown(self):
        # Restore environment and reload settings to return to healthy state
        os.environ.clear()
        os.environ.update(self.original_env)
        importlib.reload(dms.settings)

    def test_insecure_secret_key_raises_error(self):
        os.environ['DJANGO_DEBUG'] = 'False'
        os.environ['DJANGO_SECRET_KEY'] = 'django-insecure-development-secret-key-12345'
        os.environ['MEILI_MASTER_KEY'] = 'secure-master-key-longer-than-16-chars'
        os.environ['POSTGRES_PASSWORD'] = 'secure-postgres-password-longer-than-16-chars'
        
        with self.assertRaises(ImproperlyConfigured) as ctx:
            importlib.reload(dms.settings)
        self.assertIn("DJANGO_SECRET_KEY", str(ctx.exception))

    def test_weak_meili_key_raises_error(self):
        os.environ['DJANGO_DEBUG'] = 'False'
        os.environ['DJANGO_SECRET_KEY'] = 'secure-django-secret-key-longer-than-32-chars'
        os.environ['MEILI_MASTER_KEY'] = 'change_me'
        os.environ['POSTGRES_PASSWORD'] = 'secure-postgres-password-longer-than-16-chars'
        
        with self.assertRaises(ImproperlyConfigured) as ctx:
            importlib.reload(dms.settings)
        self.assertIn("MEILI_MASTER_KEY", str(ctx.exception))

    def test_short_meili_key_raises_error(self):
        os.environ['DJANGO_DEBUG'] = 'False'
        os.environ['DJANGO_SECRET_KEY'] = 'secure-django-secret-key-longer-than-32-chars'
        os.environ['MEILI_MASTER_KEY'] = 'shortkey123'
        os.environ['POSTGRES_PASSWORD'] = 'secure-postgres-password-longer-than-16-chars'
        
        with self.assertRaises(ImproperlyConfigured) as ctx:
            importlib.reload(dms.settings)
        self.assertIn("MEILI_MASTER_KEY", str(ctx.exception))

    def test_weak_postgres_password_raises_error(self):
        os.environ['DJANGO_DEBUG'] = 'False'
        os.environ['DJANGO_SECRET_KEY'] = 'secure-django-secret-key-longer-than-32-chars'
        os.environ['MEILI_MASTER_KEY'] = 'secure-master-key-longer-than-16-chars'
        os.environ['POSTGRES_PASSWORD'] = 'postgres'
        
        with self.assertRaises(ImproperlyConfigured) as ctx:
            importlib.reload(dms.settings)
        self.assertIn("POSTGRES_PASSWORD", str(ctx.exception))

    def test_short_postgres_password_raises_error(self):
        os.environ['DJANGO_DEBUG'] = 'False'
        os.environ['DJANGO_SECRET_KEY'] = 'secure-django-secret-key-longer-than-32-chars'
        os.environ['MEILI_MASTER_KEY'] = 'secure-master-key-longer-than-16-chars'
        os.environ['POSTGRES_PASSWORD'] = 'shortpass123'
        
        with self.assertRaises(ImproperlyConfigured) as ctx:
            importlib.reload(dms.settings)
        self.assertIn("POSTGRES_PASSWORD", str(ctx.exception))
