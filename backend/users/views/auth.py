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
import secrets
import string

from users.models import User, UserBackupCode, UserSession, UserActivityLog
from users.serializers import (
    LoginSerializer,
    ChangePasswordSerializer,
    BackupCodeVerifySerializer,
    BackupCodeGenerateSerializer,
    BackupCodeDisableSerializer,
    MFAEnableSerializer,
    MFADisableSerializer,
    MFAVerifyLoginSerializer,
)
from rest_framework.throttling import AnonRateThrottle

# Alphanumeric character set avoiding visually ambiguous glyphs (0, O, 1, I, L)
BACKUP_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

def generate_backup_code() -> str:
    """Generate an 8-character uppercase alphanumeric code formatted as XXXX-XXXX."""
    p1 = ''.join(secrets.choice(BACKUP_CODE_ALPHABET) for _ in range(4))
    p2 = ''.join(secrets.choice(BACKUP_CODE_ALPHABET) for _ in range(4))
    return f"{p1}-{p2}"

def hash_backup_code(raw_code: str) -> str:
    """Normalize and compute the SHA-256 hash of a backup code."""
    cleaned = raw_code.replace('-', '').replace(' ', '').strip().upper()
    return hashlib.sha256(cleaned.encode('utf-8')).hexdigest()

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
    2. HTTP_X_FORWARDED_FOR (Chain: client, proxy1, proxy2...)
       - Returns the leftmost originating client IP address (skipping Docker bridge internal hops)
    3. HTTP_X_REAL_IP (Nginx / Ingress / Traefik)
    4. REMOTE_ADDR (Direct connection fallback)

    If the only available IP is a Docker internal gateway/bridge (e.g. 172.18.0.1, 172.19.0.1),
    the request originated from the Docker host machine itself, so it resolves to '127.0.0.1'.
    """
    if not request:
        return '127.0.0.1'

    # 1. Cloudflare header
    cf_ip = request.META.get('HTTP_CF_CONNECTING_IP')
    if cf_ip and cf_ip.strip() and not is_docker_internal_ip(cf_ip):
        return cf_ip.strip()

    # 2. X-Forwarded-For chain (inspect from leftmost client to right)
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for and x_forwarded_for.strip():
        ips = [ip.strip() for ip in x_forwarded_for.split(',') if ip.strip()]
        for ip in ips:
            if not is_docker_internal_ip(ip):
                return ip

    # 3. Direct real IP header from Nginx/reverse proxy
    x_real_ip = request.META.get('HTTP_X_REAL_IP')
    if x_real_ip and x_real_ip.strip() and not is_docker_internal_ip(x_real_ip):
        return x_real_ip.strip()

    # 4. Fallback to REMOTE_ADDR
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
                    'remaining_codes': serializers.IntegerField(required=False),
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

        # If user has backup codes MFA enabled and has unused codes, require backup code verification
        unused_codes_count = user.backup_codes.filter(is_used=False).count()
        if user.is_mfa_enabled and unused_codes_count > 0:
            mfa_payload = {
                "user_id": user.id,
                "username": user.username,
                "stage": "backup_code_pending"
            }
            mfa_token = signing.dumps(mfa_payload, salt="dms-mfa-login")
            return Response({
                "mfa_required": True,
                "mfa_token": mfa_token,
                "username": user.username,
                "remaining_codes": unused_codes_count,
            }, status=status.HTTP_200_OK)

        return issue_user_login_tokens(user, request)


class BackupCodeVerifyLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginRateThrottle]

    @extend_schema(
        request=BackupCodeVerifySerializer,
        responses={
            200: inline_serializer(
                name='BackupCodeVerifyLoginResponse',
                fields={
                    'token': serializers.CharField(),
                    'role': serializers.CharField(),
                },
            ),
            400: OpenApiResponse(description='Invalid or expired MFA token / backup code'),
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = BackupCodeVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mfa_token = serializer.validated_data['mfa_token']
        code = serializer.validated_data['code'].strip()

        try:
            payload = signing.loads(mfa_token, salt="dms-mfa-login", max_age=300)
        except signing.SignatureExpired:
            return Response({"detail": "Verification session expired. Please log in again."}, status=status.HTTP_400_BAD_REQUEST)
        except signing.BadSignature:
            return Response({"detail": "Invalid verification token."}, status=status.HTTP_400_BAD_REQUEST)

        user_id = payload.get("user_id")
        user = User.objects.filter(id=user_id, is_active=True).first()
        if not user or not user.is_mfa_enabled:
            return Response({"detail": "User not found or backup codes not enabled."}, status=status.HTTP_400_BAD_REQUEST)

        code_hash = hash_backup_code(code)
        with transaction.atomic():
            backup_code = UserBackupCode.objects.select_for_update().filter(
                user=user,
                code_hash=code_hash,
                is_used=False
            ).first()

            if not backup_code:
                UserActivityLog.objects.create(
                    user=user,
                    username=user.username,
                    action='FAILED_LOGIN',
                    ip_address=get_client_ip(request),
                    device=request.META.get('HTTP_USER_AGENT', '')[:255]
                )
                return Response({"detail": "Invalid or already used backup code."}, status=status.HTTP_400_BAD_REQUEST)

            from django.utils import timezone
            backup_code.is_used = True
            backup_code.used_at = timezone.now()
            backup_code.save()

        return issue_user_login_tokens(user, request)


class BackupCodeGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=BackupCodeGenerateSerializer,
        responses={
            200: inline_serializer(
                name='BackupCodeGenerateResponse',
                fields={
                    'codes': serializers.ListField(child=serializers.CharField()),
                    'count': serializers.IntegerField(),
                    'message': serializers.CharField(),
                },
            ),
            400: OpenApiResponse(description='Invalid password'),
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = BackupCodeGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user

        # If user already has active backup codes, require password confirmation
        if user.is_mfa_enabled and user.backup_codes.filter(is_used=False).exists():
            password = serializer.validated_data.get('password', '')
            if not password or not user.check_password(password):
                return Response({"password": "Incorrect current password required to regenerate backup codes."}, status=status.HTTP_400_BAD_REQUEST)

        raw_codes = []
        with transaction.atomic():
            # Invalidate all prior backup codes
            user.backup_codes.all().delete()

            code_objects = []
            for _ in range(10):
                c = generate_backup_code()
                while c in raw_codes:
                    c = generate_backup_code()
                raw_codes.append(c)
                code_objects.append(
                    UserBackupCode(
                        user=user,
                        code_hash=hash_backup_code(c),
                        is_used=False
                    )
                )
            UserBackupCode.objects.bulk_create(code_objects)

            user.is_mfa_enabled = True
            user.save()

        UserActivityLog.objects.create(
            user=user,
            username=user.username,
            action='PERMISSIONS_CHANGED',
            ip_address=get_client_ip(request),
            device=f"Generated 10 new backup recovery codes"
        )

        return Response({
            "codes": raw_codes,
            "count": len(raw_codes),
            "message": "Store these backup codes safely. They will not be displayed again."
        }, status=status.HTTP_200_OK)


class BackupCodeDisableView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=BackupCodeDisableSerializer,
        responses={
            200: inline_serializer(
                name='BackupCodeDisableResponse',
                fields={'detail': serializers.CharField()},
            ),
            400: OpenApiResponse(description='Invalid password'),
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = BackupCodeDisableSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        password = serializer.validated_data['password']
        user = request.user

        if not user.check_password(password):
            return Response({"password": "Incorrect current password."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            user.backup_codes.all().delete()
            user.is_mfa_enabled = False
            user.save()

        UserActivityLog.objects.create(
            user=user,
            username=user.username,
            action='PERMISSIONS_CHANGED',
            ip_address=get_client_ip(request),
            device="Disabled backup codes authentication"
        )

        return Response({"detail": "Backup codes authentication has been disabled successfully."}, status=status.HTTP_200_OK)


class BackupCodeStatusView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={
            200: inline_serializer(
                name='BackupCodeStatusResponse',
                fields={
                    'is_enabled': serializers.BooleanField(),
                    'total_codes': serializers.IntegerField(),
                    'unused_codes': serializers.IntegerField(),
                    'used_codes': serializers.IntegerField(),
                },
            ),
        },
    )
    def get(self, request, *args, **kwargs):
        user = request.user
        total = user.backup_codes.count()
        unused = user.backup_codes.filter(is_used=False).count()
        used = total - unused
        return Response({
            "is_enabled": user.is_mfa_enabled and total > 0,
            "total_codes": total,
            "unused_codes": unused,
            "used_codes": used,
        }, status=status.HTTP_200_OK)


# Backwards compatibility views
MFAVerifyLoginView = BackupCodeVerifyLoginView
MFASetupView = BackupCodeGenerateView
MFAEnableView = BackupCodeGenerateView
MFADisableView = BackupCodeDisableView


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
class DetailedHealthCheckView(APIView):
    """
    Detailed enterprise telemetry endpoint returning status, latency, and queue backlog.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = []

    def get(self, request, *args, **kwargs):
        import time
        from django.db import connection
        from django.utils import timezone

        now = timezone.now()
        overall_status = "healthy"
        status_code = status.HTTP_200_OK

        checks = {}

        # 1. PostgreSQL Check
        db_start = time.perf_counter()
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            db_latency = round((time.perf_counter() - db_start) * 1000, 2)
            checks["database"] = {"status": "up", "latency_ms": db_latency}
        except Exception as e:
            checks["database"] = {"status": "down", "error": str(e) if settings.DEBUG else "Connection failed"}
            overall_status = "unhealthy"
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE

        # 2. Redis Check
        redis_start = time.perf_counter()
        try:
            broker_url = getattr(settings, 'CELERY_BROKER_URL', 'redis://redis:6379/1')
            r = redis.Redis.from_url(broker_url)
            r.ping()
            redis_latency = round((time.perf_counter() - redis_start) * 1000, 2)
            checks["redis"] = {"status": "up", "latency_ms": redis_latency}
        except Exception as e:
            checks["redis"] = {"status": "down", "error": str(e) if settings.DEBUG else "Connection failed"}
            overall_status = "unhealthy"
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE

        # 3. Meilisearch Check
        meili_start = time.perf_counter()
        try:
            from search.meili import client as meili_client
            res = meili_client.health()
            meili_latency = round((time.perf_counter() - meili_start) * 1000, 2)
            if res.get('status') == 'available':
                checks["meilisearch"] = {"status": "up", "latency_ms": meili_latency}
            else:
                checks["meilisearch"] = {"status": "degraded", "latency_ms": meili_latency}
                if overall_status == "healthy":
                    overall_status = "degraded"
        except Exception as e:
            checks["meilisearch"] = {"status": "down", "error": str(e) if settings.DEBUG else "Connection failed"}
            if overall_status == "healthy":
                overall_status = "degraded"

        # 4. Outbox Backlog Check
        outbox_info = {"pending_tasks": 0, "oldest_task_age_seconds": 0, "dead_letter_tasks": 0}
        try:
            from dies.models import OutboxTask
            pending_qs = OutboxTask.objects.filter(is_processed=False).order_by('created_at')
            pending_count = pending_qs.count()
            oldest_age = 0
            if pending_count > 0:
                oldest_task = pending_qs.first()
                if oldest_task and oldest_task.created_at:
                    oldest_age = round((now - oldest_task.created_at).total_seconds(), 1)
            
            # Dead letter: unprocessed tasks older than 1 hour or missing payload hash
            dead_letter_count = OutboxTask.objects.filter(is_processed=False, payload_hash='').count()
            
            outbox_info = {
                "pending_tasks": pending_count,
                "oldest_task_age_seconds": oldest_age,
                "dead_letter_tasks": dead_letter_count,
            }
            if pending_count > 500:
                if overall_status == "healthy":
                    overall_status = "degraded"
        except Exception as e:
            logger.warning(f"Outbox health check failed: {e}")

        return Response({
            "status": overall_status,
            "timestamp": now.isoformat(),
            "checks": checks,
            "outbox": outbox_info,
        }, status=status_code)


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
