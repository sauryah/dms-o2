import hashlib
from django.db import transaction
from django.utils.decorators import method_decorator
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import AccessToken
from users.models import User, UserSession, UserActivityLog
from users.serializers import BackupFilenameSerializer, BackupSerializer, BackupUploadSerializer, UserSerializer, LoginSerializer, ChangePasswordSerializer, UserActivityLogSerializer
from users.permissions import IsRootOnly
from dms.events import broadcast_event
from users.services.backup_service import BackupService
from dies.contracts import BACKUP_CREATE_ACTION, BACKUP_DELETE_ACTION, BACKUP_UPDATE_EVENT, BACKUP_UPLOAD_ACTION
from django.utils import timezone
import os
from django.http import StreamingHttpResponse
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema, inline_serializer
from rest_framework import serializers

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

class LoginView(APIView):
    permission_classes = [AllowAny]

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
        import redis
        from django.conf import settings

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

        # Generate token
        access_token = AccessToken.for_user(user)
        token_str = str(access_token)
        token_hash = hashlib.sha256(token_str.encode('utf-8')).hexdigest()

        # Prune older sessions if count >= SESSION_MAX_CONCURRENT
        session_max = settings.SESSION_MAX_CONCURRENT
        existing_sessions = UserSession.objects.filter(user=user).order_by('last_seen')
        existing_count = existing_sessions.count()
        if existing_count >= session_max:
            to_delete_count = existing_count - session_max + 1
            oldest_ids = list(existing_sessions.values_list('id', flat=True)[:to_delete_count])
            UserSession.objects.filter(id__in=oldest_ids).delete()

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

        return Response({
            'token': token_str,
            'role': user.role
        }, status=status.HTTP_200_OK)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsRootOnly]
    pagination_class = None



class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'first_name': user.first_name,
            'last_name': user.last_name,
        })


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

        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        return Response({
            "detail": "Password changed successfully.",
            "token": access_token,
        }, status=status.HTTP_200_OK)


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
        import uuid
        import redis
        from django.conf import settings
        
        ticket = str(uuid.uuid4())
        try:
            redis_url = settings.CACHES['default']['LOCATION']
            r = redis.Redis.from_url(redis_url)
            r.setex(f"sse_ticket:{ticket}", 30, str(request.user.id))
            return Response({"ticket": ticket}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": f"Failed to generate SSE ticket: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BackupViewSet(viewsets.ViewSet):
    permission_classes = [IsRootOnly]
    serializer_class = BackupSerializer

    @extend_schema(
        responses=inline_serializer(
            name='BackupListItem',
            many=True,
            fields={
                'filename': serializers.CharField(),
                'size_kb': serializers.FloatField(),
                'created_at': serializers.DateTimeField(),
            },
        )
    )
    def list(self, request):
        try:
            backups = BackupService.list_backups()
            for b in backups:
                b['created_at'] = timezone.make_aware(timezone.datetime.fromtimestamp(b['created_at'])).isoformat()
            return Response(backups)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @extend_schema(
        request=None,
        responses={
            201: inline_serializer(
                name='BackupCreateResponse',
                fields={
                    'status': serializers.CharField(),
                    'filename': serializers.CharField(),
                    'size_kb': serializers.FloatField(),
                },
            )
        },
    )
    def create(self, request):
        try:
            import os
            from django.utils import timezone
            filename = BackupService.create_backup()
            filepath = BackupService.validate_filepath(filename)

            broadcast_event(BACKUP_UPDATE_EVENT, {'action': BACKUP_CREATE_ACTION, 'filename': filename})
            return Response({
                'status': 'success',
                'filename': filename,
                'size_kb': round(os.path.getsize(filepath) / 1024, 2)
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    @extend_schema(
        request=BackupFilenameSerializer,
        responses={200: inline_serializer(name='BackupRestoreResponse', fields={'status': serializers.CharField()})},
    )
    def restore(self, request):
        filename = request.data.get('filename')
        if not filename:
            return Response({'error': 'Filename is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            filepath = BackupService.validate_filepath(filename)
            if not os.path.exists(filepath):
                return Response({'error': 'Backup file not found'}, status=status.HTTP_404_NOT_FOUND)

            BackupService.restore_backup(filepath, filename, request.user, request.META)
            
            return Response({'status': 'success'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    @extend_schema(
        request=BackupFilenameSerializer,
        responses={200: inline_serializer(name='BackupDeleteResponse', fields={'status': serializers.CharField()})},
    )
    def delete_backup(self, request):
        filename = request.data.get('filename')
        if not filename:
            return Response({'error': 'Filename is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            filepath = BackupService.validate_filepath(filename)
            if not os.path.exists(filepath):
                return Response({'error': 'Backup file not found'}, status=status.HTTP_404_NOT_FOUND)
            os.remove(filepath)
            broadcast_event(BACKUP_UPDATE_EVENT, {'action': BACKUP_DELETE_ACTION, 'filename': filename})
            return Response({'status': 'deleted'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    @extend_schema(
        parameters=[OpenApiParameter('filename', OpenApiTypes.STR, OpenApiParameter.QUERY, required=True)],
        responses={200: OpenApiResponse(description='Backup dump file')},
    )
    def download_backup(self, request):
        from django.http import FileResponse
        
        filename = request.query_params.get('filename')
        if not filename:
            return Response({'error': 'Filename is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            filepath = BackupService.validate_filepath(filename)
            if not os.path.exists(filepath):
                return Response({'error': 'Backup file not found'}, status=status.HTTP_404_NOT_FOUND)
            response = FileResponse(
                open(filepath, 'rb'),
                as_attachment=True,
                filename=filename,
                content_type='application/octet-stream'
            )
            response.block_size = 8192
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    @extend_schema(
        request={'multipart/form-data': BackupUploadSerializer},
        responses={
            201: inline_serializer(
                name='BackupUploadResponse',
                fields={
                    'status': serializers.CharField(),
                    'filename': serializers.CharField(),
                    'size_kb': serializers.FloatField(),
                },
            )
        },
    )
    def upload_backup(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)
            
        filename = file_obj.name
        if not filename.endswith('.dump'):
            return Response({'error': 'Only .dump files are allowed'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            filepath = BackupService.validate_filepath(filename)
            os.makedirs(os.path.dirname(filepath), exist_ok=True)

            with open(filepath, 'wb+') as destination:
                for chunk in file_obj.chunks():
                    destination.write(chunk)
            
            broadcast_event(BACKUP_UPDATE_EVENT, {'action': BACKUP_UPLOAD_ACTION, 'filename': filename})
            return Response({
                'status': 'uploaded',
                'filename': filename,
                'size_kb': round(os.path.getsize(filepath) / 1024, 2)
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
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
        
        from rest_framework_simplejwt.tokens import AccessToken
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
        from django.conf import settings
        import redis

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
        return Response({
            "valid": True,
            "user_id": request.user.id,
            "role": request.user.role
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
        import hashlib
        from django.core.cache import cache
        from django.conf import settings
        
        user = request.user
        header = request.META.get('HTTP_AUTHORIZATION')
        if header and header.startswith('Bearer '):
            token_str = header.split(' ')[1]
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

        return Response({"detail": "Logged out successfully"}, status=status.HTTP_200_OK)


class UserActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UserActivityLog.objects.all()
    serializer_class = UserActivityLogSerializer
    permission_classes = [IsRootOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        username = self.request.query_params.get('username')
        action = self.request.query_params.get('action')
        if username:
            queryset = queryset.filter(username__icontains=username)
        if action:
            queryset = queryset.filter(action=action)
        return queryset

