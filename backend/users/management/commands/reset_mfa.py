from django.core.management.base import BaseCommand, CommandError
from users.models import User


class Command(BaseCommand):
    help = 'Emergency reset of MFA / backup codes for root or any specified username.'

    def add_arguments(self, parser):
        parser.add_argument('username', nargs='?', default='root', help='Username to reset backup codes for (defaults to root).')

    def handle(self, *args, **options):
        username = options['username']
        try:
            if username.lower() == 'root':
                user = User.objects.filter(role='ROOT').first()
                if not user:
                    user = User.objects.filter(username__iexact='root').first()
            else:
                user = User.objects.filter(username__iexact=username).first()

            if not user:
                raise CommandError(f"User '{username}' not found.")

            count = user.backup_codes.count()
            user.backup_codes.all().delete()
            user.is_mfa_enabled = False
            user.save()

            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully cleared {count} backup code(s) and disabled secondary authentication for '{user.username}'. "
                    f"User can now log in with just their password."
                )
            )
        except Exception as e:
            raise CommandError(f"Failed to reset backup codes: {e}")
