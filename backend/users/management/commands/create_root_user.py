from django.core.management.base import BaseCommand
from django.conf import settings
from users.models import User

class Command(BaseCommand):
    help = 'Create root user if it does not exist'

    def handle(self, *args, **options):
        username = settings.ROOT_USERNAME
        password = settings.ROOT_PASSWORD

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f"User '{username}' already exists. Skipping root user creation."))
            return

        self.stdout.write(f"Creating root user '{username}'...")
        user = User.objects.create_superuser(
            username=username,
            password=password,
            email='root@dms.local',
            role='ROOT'
        )
        self.stdout.write(self.style.SUCCESS(f"Successfully created root user '{username}'."))
