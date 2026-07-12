import hashlib
import redis
import uuid
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

from users.models import User, UserSession, UserActivityLog
from users.serializers import LoginSerializer, ChangePasswordSerializer

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

from rest_framework.throttling import AnonRateThrottle

class LoginRateThrottle(AnonRateThrottle):
    rate = '5/minute'

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
                    'token': serializers.CharField(),
                    'role': serializers.CharField(),
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
        r = redis.Redis.from_url(redis_url)
        attempts_key = f"login_attempts:{username}"

        attempts = r.get(attempts_key)
        if attempts and int(attempts) >= 5:
            return Response(
                {"detail": "Too many failed login attempts. Please wait 5 minutes."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        user = authenticate(username=username, password=password)
        if not user:
            pipe = r.pipeline()
            pipe.incr(attempts_key)
            pipe.expire(attempts_key, 300)
            pipe.execute()

            # log failed login
            UserActivityLog.objects.create(
                username=username,
                action='FAILED_LOGIN',
                ip_address=get_client_ip(request),
                device=request.META.get('HTTP_USER_AGENT', '')[:255]
            )

            attempts = r.get(attempts_key)
            if attempts and int(attempts) >= 5:
                return Response(
                    {"detail": "Too many failed login attempts. Please wait 5 minutes."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

            return Response(
                {"detail": "Invalid username or password"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            pipe = r.pipeline()
            pipe.incr(attempts_key)
            pipe.expire(attempts_key, 300)
            pipe.execute()

            # log failed login due to inactive account
            UserActivityLog.objects.create(
                user=user,
                username=user.username,
                action='FAILED_LOGIN',
                ip_address=get_client_ip(request),
                device=request.META.get('HTTP_USER_AGENT', '')[:255]
            )

            attempts = r.get(attempts_key)
            if attempts and int(attempts) >= 5:
                return Response(
                    {"detail": "Too many failed login attempts. Please wait 5 minutes."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

            return Response(
                {"detail": "User account is inactive"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Success - clear any failed attempts
        r.delete(attempts_key)

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
            for old_sess in oldest_sessions:
                cache_key = f"user_session:{user.id}:{old_sess.token_hash}"
                django_cache.delete(cache_key)
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
            'refresh': refresh_token_str,
            'role': user.role,
            'is_authorized_for_tools': user.is_authorized_for_tools
        }, status=status.HTTP_200_OK)
        
        response.set_cookie(
            key='dms_access_token',
            value=token_str,
            httponly=True,
            samesite='Lax',
            secure=not settings.DEBUG,
            max_age=12 * 3600
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

        response = Response({
            "detail": "Password changed successfully.",
            "token": access_token,
            "refresh": refresh_token_str,
        }, status=status.HTTP_200_OK)
        
        response.set_cookie(
            key='dms_access_token',
            value=access_token,
            httponly=True,
            samesite='Lax',
            secure=not settings.DEBUG,
            max_age=12 * 3600
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
        }
        status_code = status.HTTP_200_OK

        # Check PostgreSQL
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception as e:
            status_data["status"] = "unhealthy"
            status_data["database"] = f"down: {str(e)}"
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE

        # Check Redis
        try:
            broker_url = getattr(settings, 'CELERY_BROKER_URL', 'redis://redis:6379/1')
            r = redis.Redis.from_url(broker_url)
            r.ping()
        except Exception as e:
            status_data["status"] = "unhealthy"
            status_data["redis"] = f"down: {str(e)}"
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE

        return Response(status_data, status=status_code)


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
        internal_key = request.headers.get('X-Internal-Key')
        if not internal_key or internal_key != settings.INTERNAL_API_SECRET:
            return Response({"detail": "Forbidden: Invalid internal verification key."}, status=status.HTTP_403_FORBIDDEN)

        return Response({
            "valid": True,
            "user_id": request.user.id,
            "role": request.user.role,
            "is_authorized_for_tools": request.user.is_authorized_for_tools
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
                except Exception:
                    pass

                response.set_cookie(
                    key='dms_access_token',
                    value=access_token,
                    httponly=True,
                    samesite='Lax',
                    secure=not settings.DEBUG,
                    max_age=12 * 3600
                )
            new_refresh = response.data.get('refresh')
            if new_refresh:
                response.set_cookie(
                    key='dms_refresh_token',
                    value=new_refresh,
                    httponly=True,
                    samesite='Lax',
                    secure=not settings.DEBUG,
                    max_age=24 * 3600
                )
        return response
