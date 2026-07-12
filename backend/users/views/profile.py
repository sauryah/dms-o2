from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.models import User, UserActivityLog, UserSession
from users.serializers import UserSerializer, UserActivityLogSerializer, UserSessionSerializer
from users.permissions import IsRootOnly

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
            'is_authorized_for_tools': user.is_authorized_for_tools,
        })


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


class UserSessionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsRootOnly]
    http_method_names = ['get', 'delete']

    def get_queryset(self):
        return UserSession.objects.all().select_related('user').order_by('-last_seen')

    def get_serializer_class(self):
        return UserSessionSerializer

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
