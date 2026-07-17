import hashlib
from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from users.services.session_service import SessionService
from users.context import _thread_locals


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

        is_cookie_auth = False
        if not token_str:
            token_str = request.COOKIES.get('dms_access_token')
            if token_str:
                is_cookie_auth = True
                try:
                    validated_token = self.get_validated_token(token_str)
                    user = self.get_user(validated_token)
                except Exception:
                    token_str = None
                    is_cookie_auth = False

        if not token_str:
            return None

        # CSRF Protection: Enforce custom header for state-changing cookie authenticated requests
        if is_cookie_auth and request.method not in ('GET', 'HEAD', 'OPTIONS', 'TRACE'):
            csrf_header = request.headers.get('X-Requested-With')
            if csrf_header != 'XMLHttpRequest':
                raise AuthenticationFailed("CSRF validation failed: Missing custom request header.")

        token_hash = hashlib.sha256(token_str.encode('utf-8')).hexdigest()

        session_data = SessionService.get_session_data(user, token_hash)
        SessionService.check_timeouts(user, token_hash, session_data)
        SessionService.update_last_seen(user, token_hash, session_data)

        _thread_locals.user = user

        return user, validated_token
