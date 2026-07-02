from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsRootOnly
from dies.views import DieViewSet, ImportDiesView, ImportTemplateView, ImportLogsView
from users.views import LoginView, LogoutView, UserViewSet, UserActivityLogViewSet, MeView, ChangePasswordView, KeepAliveView, SSETicketView, BackupViewSet, EventStreamView, HealthCheckView, VerifyTokenView
from history.views import DieHistoryListView
from machines.views import MachineCategoryViewSet, MachineViewSet, SetViewSet, RackViewSet

router = DefaultRouter()
router.register('dies', DieViewSet, basename='die')
router.register('users', UserViewSet, basename='user')
router.register('activity-logs', UserActivityLogViewSet, basename='user-activity-log')
router.register('categories', MachineCategoryViewSet, basename='category')
router.register('machines', MachineViewSet, basename='machine')
router.register('sets', SetViewSet, basename='set')
router.register('backups', BackupViewSet, basename='backup')
router.register('racks', RackViewSet, basename='rack')

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Schema and Documentation
    path('api/schema/', SpectacularAPIView.as_view(permission_classes=[IsAuthenticated, IsRootOnly]), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema', permission_classes=[IsAuthenticated, IsRootOnly]), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema', permission_classes=[IsAuthenticated, IsRootOnly]), name='redoc-ui'),
    
    # Authentication and Utility Endpoints
    path('api/auth/login/', LoginView.as_view(), name='login'),
    path('api/auth/logout/', LogoutView.as_view(), name='logout'),
    path('api/auth/me/', MeView.as_view(), name='auth-me'),
    path('api/auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('api/auth/keep-alive/', KeepAliveView.as_view(), name='keep-alive'),
    path('api/auth/sse-ticket/', SSETicketView.as_view(), name='sse-ticket'),
    path('api/import/', ImportDiesView.as_view(), name='import-dies'),
    path('api/import/template/', ImportTemplateView.as_view(), name='import-template'),
    path('api/import/logs/', ImportLogsView.as_view(), name='import-logs'),
    path('api/events/', EventStreamView.as_view(), name='events'),
    path('api/health/', HealthCheckView.as_view(), name='health'),
    path('api/history/', DieHistoryListView.as_view(), name='die-history'),
    path('internal/verify-token/', VerifyTokenView.as_view(), name='verify-token'),
    path('api/', include(router.urls)),
]
