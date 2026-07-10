import os
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsRootOnly
from users.services.backup_service import BackupService
from users.serializers import BackupSerializer, BackupFilenameSerializer, BackupUploadSerializer
from dms.events import broadcast_event
from dies.contracts import BACKUP_DELETE_ACTION, BACKUP_UPDATE_EVENT, BACKUP_UPLOAD_ACTION
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema, inline_serializer
from rest_framework import serializers

class BackupViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsRootOnly]
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
        responses={
            202: inline_serializer(
                name='BackupCreateResponse',
                fields={
                    'status': serializers.CharField(),
                    'task_id': serializers.CharField(),
                },
            )
        },
    )
    def create(self, request):
        try:
            from users.tasks import create_backup_task
            task = create_backup_task.delay()
            return Response({
                'status': 'pending',
                'task_id': task.id
            }, status=status.HTTP_202_ACCEPTED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    @extend_schema(
        request=BackupFilenameSerializer,
        responses={202: inline_serializer(name='BackupRestoreResponse', fields={'status': serializers.CharField(), 'task_id': serializers.CharField()})},
    )
    def restore(self, request):
        filename = request.data.get('filename')
        if not filename:
            return Response({'error': 'Filename is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            filepath = BackupService.validate_filepath(filename)
            if not os.path.exists(filepath):
                return Response({'error': 'Backup file not found'}, status=status.HTTP_404_NOT_FOUND)

            from users.tasks import restore_backup_task
            request_meta = {
                'HTTP_AUTHORIZATION': request.META.get('HTTP_AUTHORIZATION')
            }
            task = restore_backup_task.delay(filepath, filename, request.user.id, request_meta)
            
            return Response({
                'status': 'pending',
                'task_id': task.id
            }, status=status.HTTP_202_ACCEPTED)
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
