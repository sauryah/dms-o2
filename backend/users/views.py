import hashlib
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import AccessToken
from users.models import User, UserSession
from users.serializers import BackupFilenameSerializer, BackupSerializer, BackupUploadSerializer, UserSerializer, LoginSerializer
from users.permissions import IsRootOnly
from dms.events import broadcast_event
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
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']

        user = authenticate(username=username, password=password)
        if not user:
            return Response(
                {"detail": "Invalid username or password"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {"detail": "User account is inactive"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Generate token
        access_token = AccessToken.for_user(user)
        token_str = str(access_token)
        token_hash = hashlib.sha256(token_str.encode('utf-8')).hexdigest()

        # Delete any existing sessions for this user (kills previous session)
        UserSession.objects.filter(user=user).delete()

        # Create new user session
        UserSession.objects.create(
            user=user,
            token_hash=token_hash,
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
        import os
        from django.utils import timezone
        
        backup_dir = '/backups'
        if not os.path.exists(backup_dir):
            return Response([])
        
        backups = []
        try:
            for f in os.listdir(backup_dir):
                if f.endswith('.dump'):
                    filepath = os.path.join(backup_dir, f)
                    stat = os.stat(filepath)
                    backups.append({
                        'filename': f,
                        'size_kb': round(stat.st_size / 1024, 2),
                        'created_at': timezone.make_aware(
                            timezone.datetime.fromtimestamp(stat.st_mtime)
                        ).isoformat()
                    })
            # Sort by created_at descending (most recent first)
            backups.sort(key=lambda x: x['created_at'], reverse=True)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(backups)

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
        import os
        import subprocess
        from django.utils import timezone
        from django.conf import settings
        
        db_conf = settings.DATABASES['default']
        db_name = db_conf['NAME']
        db_user = db_conf['USER']
        db_password = db_conf['PASSWORD']
        db_host = db_conf['HOST']
        db_port = db_conf['PORT']

        backup_dir = '/backups'
        os.makedirs(backup_dir, exist_ok=True)

        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        filename = f"dms_backup_{timestamp}.dump"
        filepath = os.path.join(backup_dir, filename)

        env = os.environ.copy()
        env['PGPASSWORD'] = db_password

        cmd = [
            'pg_dump',
            '-F', 'c',
            '-h', db_host,
            '-p', str(db_port),
            '-U', db_user,
            '-d', db_name,
            '-f', filepath
        ]

        try:
            subprocess.run(cmd, env=env, capture_output=True, text=True, check=True)
            
            # Prune backups older than 14 days
            try:
                for f in os.listdir(backup_dir):
                    if f.endswith('.dump'):
                        fp = os.path.join(backup_dir, f)
                        stat = os.stat(fp)
                        if (timezone.now().timestamp() - stat.st_mtime) > 1209600:
                            os.remove(fp)
            except Exception:
                pass

            broadcast_event('backup_update', {'action': 'backup', 'filename': filename})
            return Response({
                'status': 'success',
                'filename': filename,
                'size_kb': round(os.path.getsize(filepath) / 1024, 2)
            }, status=status.HTTP_201_CREATED)
        except subprocess.CalledProcessError as e:
            return Response({'error': f"pg_dump failed: {e.stderr or e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    @extend_schema(
        request=BackupFilenameSerializer,
        responses={200: inline_serializer(name='BackupRestoreResponse', fields={'status': serializers.CharField()})},
    )
    def restore(self, request):
        import os
        import subprocess
        from django.conf import settings
        from search.tasks import rebuild_search_index_task
        
        filename = request.data.get('filename')
        if not filename:
            return Response({'error': 'Filename is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        backup_dir = '/backups'
        filepath = os.path.join(backup_dir, filename)
        
        if not os.path.abspath(filepath).startswith(os.path.abspath(backup_dir)):
            return Response({'error': 'Invalid filepath'}, status=status.HTTP_400_BAD_REQUEST)

        if not os.path.exists(filepath):
            return Response({'error': 'Backup file not found'}, status=status.HTTP_404_NOT_FOUND)

        db_conf = settings.DATABASES['default']
        db_name = db_conf['NAME']
        db_user = db_conf['USER']
        db_password = db_conf['PASSWORD']
        db_host = db_conf['HOST']
        db_port = db_conf['PORT']

        env = os.environ.copy()
        env['PGPASSWORD'] = db_password

        # Determine optimal number of parallel jobs for restore
        jobs = max(1, (os.cpu_count() or 2) - 1)

        cmd = [
            'pg_restore',
            '-h', db_host,
            '-p', str(db_port),
            '-U', db_user,
            '-d', db_name,
            '-j', str(jobs),
            '--clean',
            '--no-owner',
            filepath
        ]

        # Capture the restorer's active session data before restoration
        current_session_data = None
        try:
            header = request.META.get('HTTP_AUTHORIZATION')
            if header and header.startswith('Bearer '):
                token_str = header.split(' ')[1]
                token_hash = hashlib.sha256(token_str.encode('utf-8')).hexdigest()
                current_session = UserSession.objects.get(user=request.user, token_hash=token_hash)
                current_session_data = {
                    'user_id': current_session.user_id,
                    'token_hash': current_session.token_hash,
                    'ip_address': current_session.ip_address,
                    'device': current_session.device
                }
        except Exception:
            pass

        try:
            # Run the restore process
            subprocess.run(cmd, env=env, capture_output=True, text=True, check=True)

            # Evict all restored sessions to prevent unauthorized reuse of restored sessions
            try:
                from django.contrib.sessions.models import Session
                Session.objects.all().delete()
                UserSession.objects.all().delete()
            except Exception:
                pass

            # Restore the restorer's session so they stay logged in
            if current_session_data:
                try:
                    UserSession.objects.create(
                        user_id=current_session_data['user_id'],
                        token_hash=current_session_data['token_hash'],
                        ip_address=current_session_data['ip_address'],
                        device=current_session_data['device']
                    )
                except Exception:
                    pass

            # Offload the slow Meilisearch index synchronization to Celery
            rebuild_search_index_task.delay(filename)
            
            return Response({'status': 'success'}, status=status.HTTP_200_OK)
        except subprocess.CalledProcessError as e:
            return Response({'error': f"pg_restore failed: {e.stderr or e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    @extend_schema(
        request=BackupFilenameSerializer,
        responses={200: inline_serializer(name='BackupDeleteResponse', fields={'status': serializers.CharField()})},
    )
    def delete_backup(self, request):
        import os
        
        filename = request.data.get('filename')
        if not filename:
            return Response({'error': 'Filename is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        backup_dir = '/backups'
        filepath = os.path.join(backup_dir, filename)

        if not os.path.abspath(filepath).startswith(os.path.abspath(backup_dir)):
            return Response({'error': 'Invalid filepath'}, status=status.HTTP_400_BAD_REQUEST)

        if not os.path.exists(filepath):
            return Response({'error': 'Backup file not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            os.remove(filepath)
            broadcast_event('backup_update', {'action': 'delete', 'filename': filename})
            return Response({'status': 'deleted'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    @extend_schema(
        parameters=[OpenApiParameter('filename', OpenApiTypes.STR, OpenApiParameter.QUERY, required=True)],
        responses={200: OpenApiResponse(description='Backup dump file')},
    )
    def download_backup(self, request):
        import os
        from django.http import FileResponse
        
        filename = request.query_params.get('filename')
        if not filename:
            return Response({'error': 'Filename is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        backup_dir = '/backups'
        filepath = os.path.join(backup_dir, filename)
        
        if not os.path.abspath(filepath).startswith(os.path.abspath(backup_dir)):
            return Response({'error': 'Invalid filepath'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not os.path.exists(filepath):
            return Response({'error': 'Backup file not found'}, status=status.HTTP_404_NOT_FOUND)
            
        try:
            return FileResponse(open(filepath, 'rb'), as_attachment=True, filename=filename)
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
        import os
        
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)
            
        filename = file_obj.name
        if not filename.endswith('.dump'):
            return Response({'error': 'Only .dump files are allowed'}, status=status.HTTP_400_BAD_REQUEST)
            
        backup_dir = '/backups'
        os.makedirs(backup_dir, exist_ok=True)
        filepath = os.path.join(backup_dir, filename)
        
        if not os.path.abspath(filepath).startswith(os.path.abspath(backup_dir)):
            return Response({'error': 'Invalid filepath'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            with open(filepath, 'wb+') as destination:
                for chunk in file_obj.chunks():
                    destination.write(chunk)
            
            broadcast_event('backup_update', {'action': 'upload', 'filename': filename})
            return Response({
                'status': 'uploaded',
                'filename': filename,
                'size_kb': round(os.path.getsize(filepath) / 1024, 2)
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
class EventStreamView(APIView):
    permission_classes = [AllowAny]

    def perform_content_negotiation(self, request, force=False):
        from rest_framework.renderers import JSONRenderer
        return (JSONRenderer(), 'application/json')

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

