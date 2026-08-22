from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import ValidationError
from django.db.models import Q
from django.db import transaction, models
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from datetime import datetime, time
import datetime as dt
from users.models import User, UserActivityLog, UserSession
from users.serializers import UserSerializer, UserActivityLogSerializer, UserSessionSerializer
from users.permissions import IsRootOnly
from users.views.auth import get_client_ip

class UserPagination(PageNumberPagination):
    page_size = 25

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [IsRootOnly]
    pagination_class = UserPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search')
        role = self.request.query_params.get('role')
        status_param = self.request.query_params.get('status')
        tools = self.request.query_params.get('tools')

        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) | 
                Q(email__icontains=search) | 
                Q(first_name__icontains=search) | 
                Q(last_name__icontains=search)
            )
        if role:
            queryset = queryset.filter(role=role)
        if status_param:
            is_active = status_param.lower() == 'active'
            queryset = queryset.filter(is_active=is_active)
        if tools:
            is_authorized = tools.lower() == 'authorized'
            queryset = queryset.filter(is_authorized_for_tools=is_authorized)
            
        return queryset

    def perform_create(self, serializer):
        user = serializer.save()
        UserActivityLog.objects.create(
            user=self.request.user,
            username=self.request.user.username,
            action='USER_CREATED',
            ip_address=get_client_ip(self.request),
            device=f"Created user: {user.username}"
        )

    def perform_destroy(self, instance):
        username = instance.username
        instance.delete()
        UserActivityLog.objects.create(
            user=self.request.user,
            username=self.request.user.username,
            action='USER_DELETED',
            ip_address=get_client_ip(self.request),
            device=f"Deleted user: {username}"
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        old_role = instance.role
        old_is_active = instance.is_active
        old_authorized_tools = instance.authorized_tools
        
        user = serializer.save()
        
        if old_role != user.role:
            UserActivityLog.objects.create(
                user=self.request.user,
                username=self.request.user.username,
                action='ROLE_CHANGED',
                ip_address=get_client_ip(self.request),
                device=f"Changed role for {user.username} from {old_role} to {user.role}"
            )
            
        if old_is_active != user.is_active:
            action_type = 'ACCOUNT_ACTIVATED' if user.is_active else 'ACCOUNT_SUSPENDED'
            UserActivityLog.objects.create(
                user=self.request.user,
                username=self.request.user.username,
                action=action_type,
                ip_address=get_client_ip(self.request),
                device=f"{'Activated' if user.is_active else 'Suspended'} user: {user.username}"
            )
            
        if old_authorized_tools != user.authorized_tools:
            UserActivityLog.objects.create(
                user=self.request.user,
                username=self.request.user.username,
                action='PERMISSIONS_CHANGED',
                ip_address=get_client_ip(self.request),
                device=f"Changed permissions for {user.username}"
            )

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request):
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="users_export_{timezone.now().strftime("%Y-%m-%d")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['id', 'username', 'first_name', 'last_name', 'email', 'role', 'is_active', 'is_authorized_for_tools', 'authorized_tools'])
        
        users = self.get_queryset()
        for user in users:
            tools = "|".join(user.authorized_tools) if isinstance(user.authorized_tools, list) else user.authorized_tools
            writer.writerow([
                user.id, user.username, user.first_name, user.last_name, 
                user.email, user.role, user.is_active, 
                user.is_authorized_for_tools, tools
            ])
            
        UserActivityLog.objects.create(
            user=self.request.user,
            username=self.request.user.username,
            action='ADMIN_ACTION',
            ip_address=get_client_ip(self.request),
            device="Exported users"
        )
        return response

    @action(detail=False, methods=['post'], url_path='bulk_action')
    def bulk_action(self, request):
        action_type = request.data.get('action')
        user_ids = request.data.get('user_ids', [])
        
        if action_type not in ['activate', 'suspend', 'delete']:
            return Response({'detail': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not user_ids:
            return Response({'detail': 'No user IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
            
        succeeded = []
        failed = []
        
        with transaction.atomic():
            for uid in user_ids:
                try:
                    user = User.objects.get(id=uid)
                    if user.id == request.user.id:
                        failed.append({'id': uid, 'reason': 'Cannot perform action on yourself'})
                        continue
                    if user.role == 'ROOT' and action_type in ['suspend', 'delete']:
                        failed.append({'id': uid, 'reason': 'Cannot suspend or delete ROOT users'})
                        continue
                        
                    if action_type == 'activate':
                        user.is_active = True
                        user.save()
                        UserActivityLog.objects.create(
                            user=request.user, username=request.user.username,
                            action='ACCOUNT_ACTIVATED', ip_address=get_client_ip(request),
                            device=f"Bulk activated user: {user.username}"
                        )
                    elif action_type == 'suspend':
                        user.is_active = False
                        user.save()
                        UserActivityLog.objects.create(
                            user=request.user, username=request.user.username,
                            action='ACCOUNT_SUSPENDED', ip_address=get_client_ip(request),
                            device=f"Bulk suspended user: {user.username}"
                        )
                    elif action_type == 'delete':
                        username = user.username
                        user.delete()
                        UserActivityLog.objects.create(
                            user=request.user, username=request.user.username,
                            action='USER_DELETED', ip_address=get_client_ip(request),
                            device=f"Bulk deleted user: {username}"
                        )
                    succeeded.append(uid)
                except User.DoesNotExist:
                    failed.append({'id': uid, 'reason': 'User not found'})
                    
        return Response({'succeeded': succeeded, 'failed': failed})

    @action(detail=False, methods=['get'], url_path='counts')
    def counts(self, request):
        from django.core.cache import cache
        from datetime import timedelta
        
        cache_key = 'admin_user_counts'
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)
            
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        inactive_users = User.objects.filter(is_active=False).count()
        
        roles = User.objects.values('role').annotate(count=models.Count('id'))
        by_role = {role['role']: role['count'] for role in roles}
        for r in [c[0] for c in User.ROLE_CHOICES]:
            if r not in by_role:
                by_role[r] = 0
                
        active_sessions = UserSession.objects.count()
        
        last_24h = timezone.now() - timedelta(hours=24)
        recent_failed = UserActivityLog.objects.filter(action='FAILED_LOGIN', timestamp__gte=last_24h).count()
        
        total_backups = 0
        try:
            from users.services.backup_service import BackupService
            total_backups = len(BackupService.list_backups())
        except Exception:
            pass
            
        data = {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": inactive_users,
            "by_role": by_role,
            "active_sessions": active_sessions,
            "recent_failed_logins_24h": recent_failed,
            "total_backups": total_backups
        }
        
        cache.set(cache_key, data, 30)
        return Response(data)

    @action(detail=False, methods=['get'], url_path='password_policy', permission_classes=[IsAuthenticated])
    def password_policy(self, request):
        return Response({
            "rules": [
                "Minimum 8 characters",
                "Cannot be too similar to your personal info",
                "Cannot be a commonly used password",
                "Cannot be entirely numeric"
            ]
        })

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
            'is_authorized_for_tools': user.is_authorized_for_tools,
            'authorized_tools': user.authorized_tools,
            'is_mfa_enabled': user.is_mfa_enabled,
        })


class UserActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UserActivityLog.objects.all()
    serializer_class = UserActivityLogSerializer
    permission_classes = [IsRootOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        username = self.request.query_params.get('username')
        action = self.request.query_params.get('action')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if username:
            queryset = queryset.filter(username__icontains=username)
        if action:
            queryset = queryset.filter(action=action)

        from_dt = None
        to_dt = None

        if date_from:
            from_dt = parse_datetime(date_from) or parse_date(date_from)
            if from_dt:
                if isinstance(from_dt, dt.date) and not isinstance(from_dt, dt.datetime):
                    from_dt = timezone.make_aware(datetime.combine(from_dt, time.min))
                queryset = queryset.filter(timestamp__gte=from_dt)

        if date_to:
            to_dt = parse_datetime(date_to) or parse_date(date_to)
            if to_dt:
                if isinstance(to_dt, dt.date) and not isinstance(to_dt, dt.datetime):
                    to_dt = timezone.make_aware(datetime.combine(to_dt, time.max))
                
                if to_dt.date() > timezone.now().date() + dt.timedelta(days=1):
                    raise ValidationError({'date_to': 'Cannot be more than 1 day in the future'})
                queryset = queryset.filter(timestamp__lte=to_dt)

        if date_from and date_to:
            if from_dt and to_dt and from_dt > to_dt:
                raise ValidationError({'date_range': 'date_from cannot be after date_to'})

        return queryset


class UserSessionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsRootOnly]
    http_method_names = ['get', 'delete']

    def get_queryset(self):
        return UserSession.objects.all().select_related('user').order_by('-last_seen')

    def get_serializer_class(self):
        return UserSessionSerializer

    def _get_current_token_hash(self, request):
        import hashlib
        auth = request.META.get('HTTP_AUTHORIZATION', '')
        if auth.startswith('Bearer '):
            token = auth.split(' ')[1]
            return hashlib.sha256(token.encode()).hexdigest()
        cookie_token = request.COOKIES.get('dms_access_token')
        if cookie_token:
            return hashlib.sha256(cookie_token.encode()).hexdigest()
        return None

    @action(detail=False, methods=['delete'], url_path='all')
    def destroy_all(self, request):
        preserve_own = request.query_params.get('preserve_own', '').lower() == 'true'
        sessions = self.get_queryset()
        
        current_hash = None
        if preserve_own:
            current_hash = self._get_current_token_hash(request)
            if current_hash:
                sessions = sessions.exclude(token_hash=current_hash)

        count = sessions.count()
        from django.core.cache import cache
        for session in list(sessions):
            cache_key = f"user_session:{session.user.id}:{session.token_hash}"
            cache.delete(cache_key)
            UserActivityLog.objects.create(
                user=session.user,
                username=session.user.username,
                action='SESSION_EXPIRED',
                ip_address=session.ip_address,
                device=f"Forced clear all by admin ({request.user.username})"
            )
            session.delete()
        msg = f'Cleared {count} active session(s).'
        if preserve_own and current_hash:
            msg += ' Your session was preserved.'
        return Response({'detail': msg}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['delete'], url_path='bulk')
    def destroy_bulk(self, request):
        ids = request.data.get('ids', [])
        # Accept preserve_own from body (preferred) or query param (fallback)
        preserve_own_raw = request.data.get('preserve_own', request.query_params.get('preserve_own', ''))
        preserve_own = str(preserve_own_raw).lower() in ('true', '1', 'yes')
        
        if not ids:
            return Response({'detail': 'No session IDs provided.'}, status=status.HTTP_400_BAD_REQUEST)
        
        sessions = self.get_queryset().filter(id__in=ids)
        current_hash = None
        if preserve_own:
            current_hash = self._get_current_token_hash(request)
            if current_hash:
                sessions = sessions.exclude(token_hash=current_hash)

        count = sessions.count()
        from django.core.cache import cache
        for session in list(sessions):
            cache_key = f"user_session:{session.user.id}:{session.token_hash}"
            cache.delete(cache_key)
            UserActivityLog.objects.create(
                user=session.user,
                username=session.user.username,
                action='SESSION_EXPIRED',
                ip_address=session.ip_address,
                device=f"Forced bulk terminate by admin ({request.user.username})"
            )
            session.delete()
        msg = f'Cleared {count} selected session(s).'
        if preserve_own and current_hash:
            msg += ' Your session was preserved.'
        return Response({'detail': msg}, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        from django.core.cache import cache
        cache_key = f"user_session:{instance.user.id}:{instance.token_hash}"
        cache.delete(cache_key)
        
        UserActivityLog.objects.create(
            user=instance.user,
            username=instance.user.username,
            action='SESSION_EXPIRED',
            ip_address=instance.ip_address,
            device=f"Forced terminate by admin ({self.request.user.username})"
        )
        
        instance.delete()
