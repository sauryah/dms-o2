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

        # Evict session caches and log expirations
        from django.core.cache import cache
        from users.models import UserActivityLog
        import redis

        r = None
        try:
            r = redis.Redis.from_url(settings.REDIS_CACHE_URL)
        except Exception:
            pass

        for session in expired_sessions:
            # Evict Django session cache
            cache.delete(f"user_session:{session.user_id}:{session.token_hash}")
            # Evict Go API token verification cache
            if r is not None:
                try:
                    r.delete(f"verify_token:{session.token_hash}")
                except Exception:
                    pass

            UserActivityLog.objects.create(
                user=session.user,
                username=session.user.username,
                action='SESSION_EXPIRED',
                ip_address=session.ip_address,
                device=session.device
            )

        deleted_count, _ = expired_sessions.delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted_count} expired/idle sessions."))
