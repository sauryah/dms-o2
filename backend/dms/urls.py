from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from dies.views import DieViewSet, ImportDiesView
from users.views import LoginView, UserViewSet, KeepAliveView, BackupViewSet, EventStreamView
from machines.views import MachineCategoryViewSet, MachineViewSet, SetViewSet

router = DefaultRouter()
router.register('dies', DieViewSet, basename='die')
router.register('users', UserViewSet, basename='user')
router.register('categories', MachineCategoryViewSet, basename='category')
router.register('machines', MachineViewSet, basename='machine')
router.register('sets', SetViewSet, basename='set')
router.register('backups', BackupViewSet, basename='backup')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', LoginView.as_view(), name='login'),
    path('api/auth/keep-alive/', KeepAliveView.as_view(), name='keep-alive'),
    path('api/import/', ImportDiesView.as_view(), name='import-dies'),
    path('api/events/', EventStreamView.as_view(), name='events'),
    path('api/', include(router.urls)),
]


