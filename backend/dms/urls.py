from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsRootOnly
from dies.views import DieViewSet, ImportDiesView, ImportTemplateView, ImportLogsView, DieToleranceViewSet, WearAlertViewSet
from users.views import LoginView, LogoutView, UserViewSet, UserActivityLogViewSet, UserSessionViewSet, MeView, ChangePasswordView, KeepAliveView, SSETicketView, BackupViewSet, EventStreamView, HealthCheckView, VerifyTokenView, TokenRefreshView
from history.views import DieHistoryListView, MachineHistoryListView, DashboardHistoryListView, UnifiedHistoryListView
from machines.views import MachineCategoryViewSet, MachineViewSet, SetViewSet, RackViewSet

router = DefaultRouter()
router.register('dies', DieViewSet, basename='die')
router.register('users', UserViewSet, basename='user')
router.register('activity-logs', UserActivityLogViewSet, basename='user-activity-log')
router.register('active-sessions', UserSessionViewSet, basename='active-session')
router.register('categories', MachineCategoryViewSet, basename='category')
router.register('machines', MachineViewSet, basename='machine')
router.register('sets', SetViewSet, basename='set')
router.register('backups', BackupViewSet, basename='backup')
router.register('racks', RackViewSet, basename='rack')
router.register('tolerances', DieToleranceViewSet, basename='tolerance')
router.register('wear-alerts', WearAlertViewSet, basename='wear-alert')

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Schema and Documentation (v1)
    path('api/v1/schema/', SpectacularAPIView.as_view(permission_classes=[IsAuthenticated, IsRootOnly]), name='schema'),
    path('api/v1/docs/', SpectacularSwaggerView.as_view(url_name='schema', permission_classes=[IsAuthenticated, IsRootOnly]), name='swagger-ui'),
    path('api/v1/redoc/', SpectacularRedocView.as_view(url_name='schema', permission_classes=[IsAuthenticated, IsRootOnly]), name='redoc-ui'),
    
    # API Schema and Documentation (legacy - used by frontend)
    path('api/schema/', SpectacularAPIView.as_view(permission_classes=[IsAuthenticated, IsRootOnly])),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema', permission_classes=[IsAuthenticated, IsRootOnly])),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema', permission_classes=[IsAuthenticated, IsRootOnly])),
    
    # Authentication and Utility Endpoints (v1)
    path('api/v1/auth/login/', LoginView.as_view(), name='login'),
    path('api/v1/auth/logout/', LogoutView.as_view(), name='logout'),
    path('api/v1/auth/me/', MeView.as_view(), name='auth-me'),
    path('api/v1/auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('api/v1/auth/keep-alive/', KeepAliveView.as_view(), name='keep-alive'),
    path('api/v1/auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('api/v1/auth/sse-ticket/', SSETicketView.as_view(), name='sse-ticket'),
    path('api/v1/import/', ImportDiesView.as_view(), name='import-dies'),
    path('api/v1/import/template/', ImportTemplateView.as_view(), name='import-template'),
    path('api/v1/import/logs/', ImportLogsView.as_view(), name='import-logs'),
    path('api/v1/events/', EventStreamView.as_view(), name='events'),
    path('api/v1/health/', HealthCheckView.as_view(), name='health'),
    path('api/v1/history/', DieHistoryListView.as_view(), name='die-history'),
    path('api/v1/history/machines/', MachineHistoryListView.as_view(), name='machine-history'),
    path('api/v1/history/dashboard/', DashboardHistoryListView.as_view(), name='dashboard-history'),
    path('api/v1/history/unified/', UnifiedHistoryListView.as_view(), name='unified-history'),
    
    # Legacy fallbacks (used by frontend and e2e tests)
    path('api/auth/login/', LoginView.as_view()),
    path('api/auth/logout/', LogoutView.as_view()),
    path('api/auth/me/', MeView.as_view()),
    path('api/auth/change-password/', ChangePasswordView.as_view()),
    path('api/auth/keep-alive/', KeepAliveView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/auth/sse-ticket/', SSETicketView.as_view()),
    path('api/import/', ImportDiesView.as_view()),
    path('api/import/template/', ImportTemplateView.as_view()),
    path('api/import/logs/', ImportLogsView.as_view()),
    path('api/events/', EventStreamView.as_view()),
    path('api/health/', HealthCheckView.as_view()),
    path('api/history/', DieHistoryListView.as_view()),
    path('api/history/machines/', MachineHistoryListView.as_view()),
    path('api/history/dashboard/', DashboardHistoryListView.as_view()),
    path('api/history/unified/', UnifiedHistoryListView.as_view()),
    
    path('internal/verify-token/', VerifyTokenView.as_view(), name='verify-token'),
    path('api/v1/', include(router.urls)),
    path('api/', include(router.urls)),
]
