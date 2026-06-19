import hashlib
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from users.models import UserSession
from users.middleware import _thread_locals

class CustomJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        auth_res = super().authenticate(request)
        if auth_res is None:
            return None
        
        user, validated_token = auth_res
        
        # Get raw token string
        header = self.get_header(request)
        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None
            
        token_str = raw_token.decode('utf-8') if isinstance(raw_token, bytes) else str(raw_token)
        token_hash = hashlib.sha256(token_str.encode('utf-8')).hexdigest()
        
        from django.utils import timezone
        from datetime import timedelta
        from django.conf import settings

        # Look up UserSession
        try:
            session = UserSession.objects.get(user=user, token_hash=token_hash)
        except UserSession.DoesNotExist:
            raise AuthenticationFailed("Session replaced on another device or expired")

        # Check idle and absolute timeouts
        now = timezone.now()
        idle_limit = now - timedelta(minutes=settings.SESSION_IDLE_TIMEOUT_MINUTES)
        absolute_limit = now - timedelta(hours=settings.SESSION_ABSOLUTE_TIMEOUT_HOURS)

        if session.last_seen < idle_limit or session.created_at < absolute_limit:
            session.delete()
            raise AuthenticationFailed("Session replaced on another device or expired")
            
        # Update last_seen (throttled to once per minute to reduce DB writes)
        if now - session.last_seen > timedelta(minutes=1):
            session.last_seen = now
            session.save(update_fields=['last_seen'])
        
        # Set thread local user for history tracking
        _thread_locals.user = user
        
        return user, validated_token
