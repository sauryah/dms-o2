from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from dies.views import DieViewSet, search_dies, ImportDiesView
from users.views import LoginView, UserViewSet

router = DefaultRouter()
router.register('dies', DieViewSet, basename='die')
router.register('users', UserViewSet, basename='user')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', LoginView.as_view(), name='login'),
    path('api/import/', ImportDiesView.as_view(), name='import-dies'),
    path('api/search/', search_dies, name='search-dies'),
    path('api/', include(router.urls)),
]

