from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from users.models import User, UserSession, UserActivityLog

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Roles', {'fields': ('role',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Roles', {'fields': ('role',)}),
    )
    list_display = UserAdmin.list_display + ('role',)
    list_filter = UserAdmin.list_filter + ('role',)

@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'created_at', 'last_seen', 'ip_address', 'device']
    search_fields = ['user__username', 'ip_address', 'device']
    readonly_fields = ['created_at', 'last_seen']

@admin.register(UserActivityLog)
class UserActivityLogAdmin(admin.ModelAdmin):
    list_display = ['username', 'action', 'timestamp', 'ip_address', 'device']
    search_fields = ['username', 'ip_address', 'device']
    list_filter = ['action', 'timestamp']
    readonly_fields = ['timestamp']
