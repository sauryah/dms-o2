from django.core.management.base import BaseCommand
from django.conf import settings
from users.models import User

class Command(BaseCommand):
    help = 'Create root user if it does not exist'

    def handle(self, *args, **options):
        username = settings.ROOT_USERNAME
        password = settings.ROOT_PASSWORD

        try:
            user = User.objects.get(username=username)
            user.role = 'ROOT'
            user.is_superuser = True
            user.is_staff = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f"User '{username}' already exists. Ensured role and privileges (password was not overwritten)."))
        except User.DoesNotExist:
            self.stdout.write(f"Creating root user '{username}'...")
            user = User.objects.create_superuser(
                username=username,
                password=password,
                email='root@dms.local',
                role='ROOT'
            )
            self.stdout.write(self.style.SUCCESS(f"Successfully created root user '{username}'."))
