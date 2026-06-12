from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from dies.views import DieViewSet, search_dies

router = DefaultRouter()
router.register('dies', DieViewSet, basename='die')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/search/', search_dies, name='search-dies'),
    path('api/', include(router.urls)),
]
