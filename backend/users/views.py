import hashlib
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import AccessToken
from users.models import User, UserSession
from users.serializers import UserSerializer, LoginSerializer
from users.permissions import IsRootOnly

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

class LoginView(APIView):
    permission_classes = [AllowAny]

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


class KeepAliveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        return Response({"status": "active"}, status=status.HTTP_200_OK)


class BackupViewSet(viewsets.ViewSet):
    permission_classes = [IsRootOnly]

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
    def restore(self, request):
        import os
        import subprocess
        from django.conf import settings
        from django.core.management import call_command
        
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

        cmd = [
            'pg_restore',
            '-h', db_host,
            '-p', str(db_port),
            '-U', db_user,
            '-d', db_name,
            '--clean',
            '--no-owner',
            filepath
        ]

        try:
            # Evict all other active user sessions (Option 3 - Session Eviction)
            try:
                from django.contrib.sessions.models import Session
                # Terminate Django session store records
                Session.objects.all().delete()
                # Terminate DMS custom session records for other users
                UserSession.objects.exclude(user=request.user).delete()
            except Exception:
                pass

            subprocess.run(cmd, env=env, capture_output=True, text=True, check=True)
            call_command('sync_search')
            return Response({'status': 'success'}, status=status.HTTP_200_OK)
        except subprocess.CalledProcessError as e:
            return Response({'error': f"pg_restore failed: {e.stderr or e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
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
            return Response({'status': 'deleted'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
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
            
            return Response({
                'status': 'uploaded',
                'filename': filename,
                'size_kb': round(os.path.getsize(filepath) / 1024, 2)
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
