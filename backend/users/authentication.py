import hashlib
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from users.models import UserSession
from users.middleware import _thread_locals

class CustomJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        token_str = None
        validated_token = None
        user = None

        if header:
            raw_token = self.get_raw_token(header)
            if raw_token is not None:
                token_str = raw_token.decode('utf-8') if isinstance(raw_token, bytes) else str(raw_token)
                try:
                    validated_token = self.get_validated_token(token_str)
                    user = self.get_user(validated_token)
                except Exception:
                    token_str = None

        if not token_str:
            token_str = request.COOKIES.get('dms_access_token')
            if token_str:
                try:
                    validated_token = self.get_validated_token(token_str)
                    user = self.get_user(validated_token)
                except Exception:
                    token_str = None

        if not token_str:
            return None

        token_hash = hashlib.sha256(token_str.encode('utf-8')).hexdigest()
        
        from django.utils import timezone
        from datetime import timedelta
        from django.conf import settings

        from django.utils import timezone
        from datetime import timedelta
        from django.conf import settings
        from django.core.cache import cache
        from users.models import UserSession

        now = timezone.now()
        cache_key = f"user_session:{user.id}:{token_hash}"
        cached_data = cache.get(cache_key)
        
        session_created_at = None
        session_last_seen = None
        ip_address = ""
        device = ""

        if cached_data:
            try:
                session_created_at = timezone.datetime.fromisoformat(cached_data['created_at'])
                session_last_seen = timezone.datetime.fromisoformat(cached_data['last_seen'])
                ip_address = cached_data.get('ip_address', '')
                device = cached_data.get('device', '')
            except (KeyError, ValueError, TypeError):
                # Cache corrupted or old format, trigger DB fetch
                cached_data = None

        if not cached_data:
            try:
                session = UserSession.objects.get(user=user, token_hash=token_hash)
                session_created_at = session.created_at
                session_last_seen = session.last_seen
                ip_address = session.ip_address
                device = session.device
                
                # Cache the session parameters
                cache_data = {
                    'ip_address': ip_address,
                    'device': device,
                    'created_at': session_created_at.isoformat(),
                    'last_seen': session_last_seen.isoformat(),
                }
                cache.set(cache_key, cache_data, timeout=settings.SESSION_ABSOLUTE_TIMEOUT_HOURS * 3600)
            except UserSession.DoesNotExist:
                raise AuthenticationFailed("Session replaced on another device or expired")

        # Check idle and absolute timeouts
        idle_limit = now - timedelta(minutes=settings.SESSION_IDLE_TIMEOUT_MINUTES)
        absolute_limit = now - timedelta(hours=settings.SESSION_ABSOLUTE_TIMEOUT_HOURS)

        if session_last_seen < idle_limit or session_created_at < absolute_limit:
            # Cleanup DB & Cache
            UserSession.objects.filter(user=user, token_hash=token_hash).delete()
            cache.delete(cache_key)
            
            # Log session expiration
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=user,
                username=user.username,
                action='SESSION_EXPIRED',
                ip_address=ip_address,
                device=device
            )
            
            raise AuthenticationFailed("Session replaced on another device or expired")

        # Update last_seen (throttled to once per minute to reduce DB writes)
        if now - session_last_seen > timedelta(minutes=1):
            session_last_seen = now
            # Update database
            updated_count = UserSession.objects.filter(user=user, token_hash=token_hash).update(last_seen=now)
            if updated_count == 0:
                # DB was restored, recreate DB row seamlessly using cache data
                UserSession.objects.create(
                    user=user,
                    token_hash=token_hash,
                    ip_address=ip_address,
                    device=device,
                    created_at=session_created_at,
                    last_seen=now
                )
            
            # Update cache
            cache_data = {
                'ip_address': ip_address,
                'device': device,
                'created_at': session_created_at.isoformat(),
                'last_seen': session_last_seen.isoformat(),
            }
            cache.set(cache_key, cache_data, timeout=settings.SESSION_ABSOLUTE_TIMEOUT_HOURS * 3600)

        # Set thread local user for history tracking
        _thread_locals.user = user
        
        return user, validated_token

