import hashlib
import ipaddress
import redis
import logging

logger = logging.getLogger(__name__)
import uuid
import socket
from django.conf import settings
from django.db import transaction
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView as SimpleJWTTokenRefreshView
from django.http import StreamingHttpResponse
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema, inline_serializer
from rest_framework import serializers

from django.core import signing
import pyotp
import qrcode
import base64
import io

from users.models import User, UserSession, UserActivityLog
from users.serializers import (
    LoginSerializer,
    ChangePasswordSerializer,
    MFAEnableSerializer,
    MFADisableSerializer,
    MFAVerifyLoginSerializer,
)
from rest_framework.throttling import AnonRateThrottle

DOCKER_INTERNAL_SUBNETS = [
    ipaddress.ip_network('172.16.0.0/12'),  # 172.16.0.0 - 172.31.255.255 (Docker standard bridges)
]

def is_docker_internal_ip(ip_str: str) -> bool:
    """Checks if an IP address string belongs to an internal Docker bridge subnet."""
    if not ip_str:
        return False
    try:
        ip_obj = ipaddress.ip_address(ip_str.strip())
        return any(ip_obj in subnet for subnet in DOCKER_INTERNAL_SUBNETS)
    except ValueError:
        return False

def get_client_ip(request):
    """
    Extracts the real client IP address from incoming request headers.
    Prioritizes headers in standard reverse-proxy order:
    1. HTTP_CF_CONNECTING_IP (Cloudflare)
    2. HTTP_X_CLIENT_DEVICE_IP (Direct browser-detected client IP)
    3. HTTP_X_FORWARDED_FOR (Chain: client, proxy1, proxy2...)
       - Returns the leftmost originating client IP address (skipping Docker bridge internal hops)
    4. HTTP_X_REAL_IP (Nginx / Ingress / Traefik)
    5. Request body client_ip (if sent during login)
    6. REMOTE_ADDR (Direct connection fallback)

    If the only available IP is a Docker internal gateway/bridge (e.g. 172.18.0.1, 172.19.0.1),
    the request originated from the Docker host machine itself, so it resolves to '127.0.0.1'.
    """
    if not request:
        return '127.0.0.1'

    # 1. Cloudflare header
    cf_ip = request.META.get('HTTP_CF_CONNECTING_IP')
    if cf_ip and cf_ip.strip():
        return cf_ip.strip()

    # 2. Direct browser client device header
    client_dev_ip = request.META.get('HTTP_X_CLIENT_DEVICE_IP')
    if client_dev_ip and client_dev_ip.strip():
        return client_dev_ip.strip()

    # 3. X-Forwarded-For chain (inspect from leftmost client to right)
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for and x_forwarded_for.strip():
        ips = [ip.strip() for ip in x_forwarded_for.split(',') if ip.strip()]
        for ip in ips:
            if not is_docker_internal_ip(ip):
                return ip

    # 4. Direct real IP header from Nginx/reverse proxy
    x_real_ip = request.META.get('HTTP_X_REAL_IP')
    if x_real_ip and x_real_ip.strip() and not is_docker_internal_ip(x_real_ip):
        return x_real_ip.strip()

    # 5. Check if login body sent client_ip
    if hasattr(request, 'data') and isinstance(request.data, dict):
        body_ip = request.data.get('client_ip')
        if body_ip and isinstance(body_ip, str) and body_ip.strip() and not is_docker_internal_ip(body_ip):
            return body_ip.strip()

    # 6. Fallback to REMOTE_ADDR
    remote_addr = request.META.get('REMOTE_ADDR')
    if remote_addr and remote_addr.strip() and not is_docker_internal_ip(remote_addr):
        return remote_addr.strip()

    # If all available addresses are Docker internal bridge IPs (e.g. 172.18.0.1),
    # the request originated from the host machine (localhost).
    return '127.0.0.1'


class LoginRateThrottle(AnonRateThrottle):
    rate = '5/minute'

    def allow_request(self, request, view):
        if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            return True
        return super().allow_request(request, view)


def issue_user_login_tokens(user, request):
    """
    Helper function to prune concurrent sessions, issue JWT access + refresh tokens,
    create a new UserSession record, log LOGIN activity, and set secure HTTP-only cookies.
    """
    # Generate tokens
    refresh = RefreshToken.for_user(user)
    token_str = str(refresh.access_token)
    refresh_token_str = str(refresh)
    token_hash = hashlib.sha256(token_str.encode('utf-8')).hexdigest()

    # Prune older sessions if count >= SESSION_MAX_CONCURRENT
    session_max = settings.SESSION_MAX_CONCURRENT
    existing_sessions = UserSession.objects.filter(user=user).order_by('last_seen')
    existing_count = existing_sessions.count()
    if existing_count >= session_max:
        to_delete_count = existing_count - session_max + 1
        oldest_sessions = list(existing_sessions[:to_delete_count])
        from django.core.cache import cache as django_cache
        from django.utils import timezone
        for old_sess in oldest_sessions:
            eviction_key = f"evicted_session:{user.id}:{old_sess.token_hash}"
            try:
                django_cache.set(
                    eviction_key,
                    {
                        "evicted_by_ip": get_client_ip(request),
                        "evicted_by_device": request.META.get('HTTP_USER_AGENT', '')[:255],
                        "evicted_at": timezone.now().isoformat()
                    },
                    timeout=3600
                )
                cache_key = f"user_session:{user.id}:{old_sess.token_hash}"
                django_cache.delete(cache_key)
            except Exception:
                pass
            old_sess.delete()

    # Create new user session
    UserSession.objects.create(
        user=user,
        token_hash=token_hash,
        ip_address=get_client_ip(request),
        device=request.META.get('HTTP_USER_AGENT', '')[:255]
    )

    # Log successful login
    UserActivityLog.objects.create(
        user=user,
        username=user.username,
        action='LOGIN',
        ip_address=get_client_ip(request),
        device=request.META.get('HTTP_USER_AGENT', '')[:255]
    )

    response = Response({
        'token': token_str,
        'role': user.role,
        'is_authorized_for_tools': user.is_authorized_for_tools,
        'authorized_tools': user.authorized_tools
    }, status=status.HTTP_200_OK)
    
    response.set_cookie(
        key='dms_access_token',
        value=token_str,
        httponly=True,
        samesite='Lax',
        secure=not settings.DEBUG,
        max_age=15 * 60
    )
    response.set_cookie(
        key='dms_refresh_token',
        value=refresh_token_str,
        httponly=True,
        samesite='Lax',
        secure=not settings.DEBUG,
        max_age=24 * 3600
    )
    return response


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginRateThrottle]

    @extend_schema(
        request=LoginSerializer,
        responses={
            200: inline_serializer(
                name='LoginResponse',
                fields={
                    'token': serializers.CharField(required=False),
                    'role': serializers.CharField(required=False),
                    'mfa_required': serializers.BooleanField(required=False),
                    'mfa_token': serializers.CharField(required=False),
                },
            ),
            401: OpenApiResponse(description='Invalid credentials or inactive account'),
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']

        redis_url = settings.CACHES['default']['LOCATION']
        # Check failed attempts in Redis
        redis_available = True
        try:
            r = redis.Redis.from_url(redis_url)
            attempts_key = f"login_attempts:{username}"

            pipe = r.pipeline()
            pipe.get(attempts_key)
            attempts_raw = pipe.execute()[0]
            if attempts_raw and int(attempts_raw) >= 5:
                return Response(
                    {"detail": "Too many failed login attempts. Please wait 5 minutes."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
        except Exception as e:
            redis_available = False
            logger.warning(f"Redis rate limiting unavailable during login attempt: {e}")

        user = authenticate(username=username, password=password)
        if not user or not user.is_active:
            if redis_available:
                try:
                    pipe = r.pipeline()
                    pipe.incr(attempts_key)
                    pipe.expire(attempts_key, 300)
                    pipe.execute()
                except Exception:
                    pass

            detail = "Invalid username or password"
            if user and not user.is_active:
                detail = "User account is inactive"

            UserActivityLog.objects.create(
                user=user if user else None,
                username=username,
                action='FAILED_LOGIN',
                ip_address=get_client_ip(request),
                device=request.META.get('HTTP_USER_AGENT', '')[:255]
            )

            return Response(
                {"detail": detail},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Success - clear any failed attempts
        if redis_available:
            try:
                r.delete(attempts_key)
            except Exception:
                pass

        # If user has MFA enabled, return MFA required response with a temporary signed token
        if user.is_mfa_enabled and user.totp_secret:
            mfa_payload = {
                "user_id": user.id,
                "username": user.username,
                "stage": "mfa_pending"
            }
            mfa_token = signing.dumps(mfa_payload, salt="dms-mfa-login")
            return Response({
                "mfa_required": True,
                "mfa_token": mfa_token,
                "username": user.username,
            }, status=status.HTTP_200_OK)

        return issue_user_login_tokens(user, request)


class MFAVerifyLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginRateThrottle]

    @extend_schema(
        request=MFAVerifyLoginSerializer,
        responses={
            200: inline_serializer(
                name='MFAVerifyLoginResponse',
                fields={
                    'token': serializers.CharField(),
                    'role': serializers.CharField(),
                },
            ),
            400: OpenApiResponse(description='Invalid or expired MFA token / code'),
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = MFAVerifyLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mfa_token = serializer.validated_data['mfa_token']
        code = serializer.validated_data['code'].strip()

        try:
            payload = signing.loads(mfa_token, salt="dms-mfa-login", max_age=300)
        except signing.SignatureExpired:
            return Response({"detail": "MFA verification session expired. Please log in again."}, status=status.HTTP_400_BAD_REQUEST)
        except signing.BadSignature:
            return Response({"detail": "Invalid MFA verification token."}, status=status.HTTP_400_BAD_REQUEST)

        user_id = payload.get("user_id")
        user = User.objects.filter(id=user_id, is_active=True).first()
        if not user or not user.is_mfa_enabled or not user.totp_secret:
            return Response({"detail": "User not found or MFA not configured."}, status=status.HTTP_400_BAD_REQUEST)

        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(code, valid_window=1):
            UserActivityLog.objects.create(
                user=user,
                username=user.username,
                action='FAILED_LOGIN',
                ip_address=get_client_ip(request),
                device=request.META.get('HTTP_USER_AGENT', '')[:255]
            )
            return Response({"detail": "Invalid 6-digit verification code."}, status=status.HTTP_400_BAD_REQUEST)

        return issue_user_login_tokens(user, request)


class MFASetupView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={
            200: inline_serializer(
                name='MFASetupResponse',
                fields={
                    'secret': serializers.CharField(),
                    'otpauth_uri': serializers.CharField(),
                    'qr_code': serializers.CharField(),
                },
            ),
        },
    )
    def post(self, request, *args, **kwargs):
        user = request.user
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        otpauth_uri = totp.provisioning_uri(name=user.username, issuer_name="DMS-O2")

        # Generate QR code base64
        qr_img = qrcode.make(otpauth_uri)
        buffer = io.BytesIO()
        qr_img.save(buffer)
        qr_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        qr_code_data_url = f"data:image/png;base64,{qr_b64}"

        # Store pending secret in Redis for 10 minutes
        try:
            redis_url = settings.CACHES['default']['LOCATION']
            r = redis.Redis.from_url(redis_url)
            r.setex(f"mfa_setup_secret:{user.id}", 600, secret)
        except Exception as e:
            logger.warning(f"Redis cache write failed during MFA setup: {e}")

        return Response({
            "secret": secret,
            "otpauth_uri": otpauth_uri,
            "qr_code": qr_code_data_url,
        }, status=status.HTTP_200_OK)


class MFAEnableView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=MFAEnableSerializer,
        responses={
            200: inline_serializer(
                name='MFAEnableResponse',
                fields={'detail': serializers.CharField()},
            ),
            400: OpenApiResponse(description='Invalid code or setup expired'),
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = MFAEnableSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data['code'].strip()
        user = request.user

        secret = None
        try:
            redis_url = settings.CACHES['default']['LOCATION']
            r = redis.Redis.from_url(redis_url)
            cached_secret = r.get(f"mfa_setup_secret:{user.id}")
            if cached_secret:
                secret = cached_secret.decode('utf-8')
        except Exception as e:
            logger.warning(f"Redis lookup failed during MFA enable: {e}")

        if not secret:
            return Response({"detail": "MFA setup session expired or not initialized. Please click Setup again."}, status=status.HTTP_400_BAD_REQUEST)

        totp = pyotp.TOTP(secret)
        if not totp.verify(code, valid_window=1):
            return Response({"detail": "Invalid 6-digit verification code. Check your authenticator app."}, status=status.HTTP_400_BAD_REQUEST)

        user.totp_secret = secret
        user.is_mfa_enabled = True
        user.save()

        try:
            r.delete(f"mfa_setup_secret:{user.id}")
        except Exception:
            pass

        UserActivityLog.objects.create(
            user=user,
            username=user.username,
            action='PERMISSIONS_CHANGED',
            ip_address=get_client_ip(request),
            device=request.META.get('HTTP_USER_AGENT', '')[:255]
        )

        return Response({"detail": "Two-factor authentication has been enabled successfully."}, status=status.HTTP_200_OK)


class MFADisableView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=MFADisableSerializer,
        responses={
            200: inline_serializer(
                name='MFADisableResponse',
                fields={'detail': serializers.CharField()},
            ),
            400: OpenApiResponse(description='Invalid password or code'),
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = MFADisableSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        password = serializer.validated_data['password']
        code = serializer.validated_data['code'].strip()
        user = request.user

        if not user.check_password(password):
            return Response({"password": "Incorrect current password."}, status=status.HTTP_400_BAD_REQUEST)

        if user.is_mfa_enabled and user.totp_secret:
            totp = pyotp.TOTP(user.totp_secret)
            if not totp.verify(code, valid_window=1):
                return Response({"code": "Invalid 6-digit verification code."}, status=status.HTTP_400_BAD_REQUEST)

        user.totp_secret = ''
        user.is_mfa_enabled = False
        user.save()

        UserActivityLog.objects.create(
            user=user,
            username=user.username,
            action='PERMISSIONS_CHANGED',
            ip_address=get_client_ip(request),
            device=request.META.get('HTTP_USER_AGENT', '')[:255]
        )

        return Response({"detail": "Two-factor authentication has been disabled successfully."}, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=ChangePasswordSerializer,
        responses={
            200: inline_serializer(
                name='ChangePasswordResponse',
                fields={'detail': serializers.CharField(), 'token': serializers.CharField()},
            ),
        },
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['current_password']):
            return Response({"current_password": "Incorrect current password."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token_str = str(refresh)

        # Register the new token session so CustomJWTAuthentication accepts it
        access_hash = hashlib.sha256(access_token.encode('utf-8')).hexdigest()
        UserSession.objects.create(
            user=user,
            token_hash=access_hash,
            ip_address=get_client_ip(request),
            device=request.META.get('HTTP_USER_AGENT', '')[:255]
        )

        response = Response({
            "detail": "Password changed successfully.",
            "token": access_token,
        }, status=status.HTTP_200_OK)
        
        response.set_cookie(
            key='dms_access_token',
            value=access_token,
            httponly=True,
            samesite='Lax',
            secure=not settings.DEBUG,
            max_age=15 * 60
        )
        response.set_cookie(
            key='dms_refresh_token',
            value=refresh_token_str,
            httponly=True,
            samesite='Lax',
            secure=not settings.DEBUG,
            max_age=24 * 3600
        )
        return response


class KeepAliveView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={
            200: inline_serializer(
                name='KeepAliveResponse',
                fields={'status': serializers.CharField()},
            ),
        },
    )
    def post(self, request, *args, **kwargs):
        return Response({"status": "active"}, status=status.HTTP_200_OK)


class SSETicketView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={
            200: inline_serializer(
                name='SSETicketResponse',
                fields={'ticket': serializers.UUIDField()},
            ),
        },
    )
    def post(self, request, *args, **kwargs):
        ticket = str(uuid.uuid4())
        try:
            redis_url = settings.CACHES['default']['LOCATION']
            r = redis.Redis.from_url(redis_url)
            r.setex(f"sse_ticket:{ticket}", 30, str(request.user.id))
            return Response({"ticket": ticket}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": f"Failed to generate SSE ticket: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(transaction.non_atomic_requests, name='dispatch')
class EventStreamView(APIView):
    permission_classes = [AllowAny]

    def perform_content_negotiation(self, request, force=False):
        from rest_framework.renderers import JSONRenderer
        return (JSONRenderer(), 'application/json')

    @extend_schema(
        parameters=[OpenApiParameter('token', OpenApiTypes.STR, OpenApiParameter.QUERY, required=True)],
        responses={200: OpenApiResponse(description="Server-Sent Events connection stream")},
        description="Establish a Server-Sent Events (SSE) stream for real-time die/machine/set updates."
    )
    def get(self, request):
        token = request.query_params.get('token')
        if not token:
            return Response({'error': 'Authentication token is required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            validated_token = AccessToken(token)
        except Exception:
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_401_UNAUTHORIZED)
            
        def dummy_generator():
            yield "event: connected\ndata: {}\n\n"
            
        response = StreamingHttpResponse(dummy_generator(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response


@method_decorator(transaction.non_atomic_requests, name='dispatch')
class HealthCheckView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = []

    @extend_schema(
        request=None,
        responses={
            200: inline_serializer(
                name='HealthCheckResponse',
                fields={
                    'status': serializers.CharField(),
                    'database': serializers.CharField(),
                    'redis': serializers.CharField(),
                },
            ),
            503: inline_serializer(
                name='HealthCheckErrorResponse',
                fields={
                    'status': serializers.CharField(),
                    'database': serializers.CharField(),
                    'redis': serializers.CharField(),
                },
            ),
        },
    )
    def get(self, request, *args, **kwargs):
        from django.db import connection

        status_data = {
            "status": "healthy",
            "database": "up",
            "redis": "up",
            "meilisearch": "up",
        }
        status_code = status.HTTP_200_OK

        # Check PostgreSQL
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception as e:
            status_data["status"] = "unhealthy"
            status_data["database"] = "down" if not settings.DEBUG else f"down: {str(e)}"
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE

        # Check Redis
        try:
            broker_url = getattr(settings, 'CELERY_BROKER_URL', 'redis://redis:6379/1')
            r = redis.Redis.from_url(broker_url)
            r.ping()
        except Exception as e:
            status_data["status"] = "unhealthy"
            status_data["redis"] = "down" if not settings.DEBUG else f"down: {str(e)}"
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE

        # Check Meilisearch
        try:
            from search.meili import client as meili_client
            res = meili_client.health()
            if res.get('status') != 'available':
                raise ValueError("Meilisearch not reporting available status")
        except Exception as e:
            status_data["status"] = "unhealthy"
            status_data["meilisearch"] = "down" if not settings.DEBUG else f"down: {str(e)}"
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE

        return Response(status_data, status=status_code)


@method_decorator(transaction.non_atomic_requests, name='dispatch')
class LivenessCheckView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = []

    def get(self, request, *args, **kwargs):
        return Response({"status": "live"}, status=status.HTTP_200_OK)


@method_decorator(transaction.non_atomic_requests, name='dispatch')
class ReadinessCheckView(HealthCheckView):
    pass


@method_decorator(transaction.non_atomic_requests, name='dispatch')
class ServerInfoView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = []

    def get(self, request, *args, **kwargs):
        hostname = socket.gethostname()
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            server_ip = s.getsockname()[0]
            s.close()
        except Exception:
            server_ip = request.get_host().split(':')[0]
        return Response({
            "hostname": hostname,
            "ip": server_ip,
        })


@method_decorator(transaction.non_atomic_requests, name='dispatch')
class VerifyTokenView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = []

    @extend_schema(
        request=None,
        responses={
            200: inline_serializer(
                name='VerifyTokenResponse',
                fields={
                    'valid': serializers.BooleanField(),
                    'user_id': serializers.IntegerField(),
                    'role': serializers.CharField(),
                },
            ),
        },
    )
    def post(self, request, *args, **kwargs):
        import hmac
        internal_key = request.headers.get('X-Internal-Key')
        if not internal_key or not hmac.compare_digest(internal_key, settings.INTERNAL_API_SECRET):
            return Response({"detail": "Forbidden: Invalid internal verification key."}, status=status.HTTP_403_FORBIDDEN)

        return Response({
            "valid": True,
            "user_id": request.user.id,
            "role": request.user.role,
            "is_authorized_for_tools": request.user.is_authorized_for_tools,
            "authorized_tools": request.user.authorized_tools
        }, status=status.HTTP_200_OK)

    @extend_schema(exclude=True)
    def get(self, request, *args, **kwargs):
        return self.post(request, *args, **kwargs)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={200: OpenApiResponse(description="Logged out successfully")},
    )
    def post(self, request, *args, **kwargs):
        from django.core.cache import cache
        
        user = request.user
        token_str = None
        header = request.META.get('HTTP_AUTHORIZATION')
        if header and header.startswith('Bearer '):
            token_str = header.split(' ')[1]
        else:
            token_str = request.COOKIES.get('dms_access_token')

        if token_str:
            token_hash = hashlib.sha256(token_str.encode('utf-8')).hexdigest()
            
            # Delete UserSession
            UserSession.objects.filter(user=user, token_hash=token_hash).delete()
            # Invalidate Cache
            cache_key = f"user_session:{user.id}:{token_hash}"
            cache.delete(cache_key)

            # Direct Redis delete for Go verify_token cache key (to bypass Django prefix)
            try:
                import redis
                from django.conf import settings
                r = redis.Redis.from_url(settings.REDIS_CACHE_URL)
                r.delete(f"verify_token:{token_hash}")
            except Exception:
                pass

        # Log action
        UserActivityLog.objects.create(
            user=user,
            username=user.username,
            action='LOGOUT',
            ip_address=get_client_ip(request),
            device=request.META.get('HTTP_USER_AGENT', '')[:255]
        )

        response = Response({"detail": "Logged out successfully"}, status=status.HTTP_200_OK)
        response.delete_cookie('dms_access_token')
        response.delete_cookie('dms_refresh_token')
        return response


class TokenRefreshView(SimpleJWTTokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            refresh_token = request.COOKIES.get('dms_refresh_token')
            if refresh_token:
                if hasattr(request.data, '_mutable'):
                    original_mutable = request.data._mutable
                    request.data._mutable = True
                    request.data['refresh'] = refresh_token
                    request.data._mutable = original_mutable
                else:
                    request.data['refresh'] = refresh_token

        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            access_token = response.data.get('access')
            if access_token:
                try:
                    ref_obj = RefreshToken(refresh_token)
                    user_id = ref_obj['user_id']
                    new_hash = hashlib.sha256(access_token.encode('utf-8')).hexdigest()
                    
                    old_access = request.COOKIES.get('dms_access_token')
                    session = None
                    if old_access:
                        old_hash = hashlib.sha256(old_access.encode('utf-8')).hexdigest()
                        session = UserSession.objects.filter(user_id=user_id, token_hash=old_hash).first()
                    if not session:
                        session = UserSession.objects.filter(user_id=user_id).order_by('-last_seen').first()
                        
                    if session:
                        from django.core.cache import cache
                        old_cache_key = f"user_session:{user_id}:{session.token_hash}"
                        cache.delete(old_cache_key)
                        
                        session.token_hash = new_hash
                        session.save()
                        
                        new_cache_key = f"user_session:{user_id}:{new_hash}"
                        cache_data = {
                            'ip_address': session.ip_address,
                            'device': session.device,
                            'created_at': session.created_at.isoformat(),
                            'last_seen': session.last_seen.isoformat(),
                        }
                        cache.set(new_cache_key, cache_data, timeout=settings.SESSION_ABSOLUTE_TIMEOUT_HOURS * 3600)
                except Exception as e:
                    logger.error(f"Token refresh session update failed: {e}")

                # Do not pop 'access' from response.data, frontend useApi requires it
                response.data.pop('refresh', None)
                response.set_cookie(
                    key='dms_access_token',
                    value=access_token,
                    httponly=True,
                    samesite='Lax',
                    secure=not settings.DEBUG,
                    max_age=15 * 60
                )
            new_refresh = response.data.get('refresh')
            if new_refresh:
                response.data.pop('refresh', None)
                response.set_cookie(
                    key='dms_refresh_token',
                    value=new_refresh,
                    httponly=True,
                    samesite='Lax',
                    secure=not settings.DEBUG,
                    max_age=24 * 3600
                )
        return response
