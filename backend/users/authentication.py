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
        
        # Look up UserSession
        try:
            session = UserSession.objects.get(user=user, token_hash=token_hash)
        except UserSession.DoesNotExist:
            raise AuthenticationFailed("Session replaced on another device or expired")
            
        # Update last_seen
        session.save()
        
        # Set thread local user for history tracking
        _thread_locals.user = user
        
        return user, validated_token
