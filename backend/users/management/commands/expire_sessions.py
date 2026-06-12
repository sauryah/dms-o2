from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from users.models import UserSession

class Command(BaseCommand):
    help = 'Prune user sessions that have timed out due to idleness or absolute duration'

    def handle(self, *args, **options):
        now = timezone.now()
        idle_limit = now - timedelta(minutes=settings.SESSION_IDLE_TIMEOUT_MINUTES)
        absolute_limit = now - timedelta(hours=settings.SESSION_ABSOLUTE_TIMEOUT_HOURS)

        # Query sessions that are past idle timeout or past absolute timeout
        expired_sessions = UserSession.objects.filter(
            last_seen__lt=idle_limit
        ) | UserSession.objects.filter(
            created_at__lt=absolute_limit
        )

        deleted_count, _ = expired_sessions.delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted_count} expired/idle sessions."))
