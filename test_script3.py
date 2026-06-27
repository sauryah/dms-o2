import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dms.settings')
django.setup()

from users.views import BackupViewSet

print("views syntax ok")
