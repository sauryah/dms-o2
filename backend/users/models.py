from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings

class User(AbstractUser):
    ROLE_CHOICES = [
        ('ROOT', 'Root'),
        ('ADMIN', 'Admin'),
        ('OPERATOR', 'Operator'),
        ('REGULAR', 'Regular'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='REGULAR')
    is_authorized_for_tools = models.BooleanField(default=False)
    authorized_tools = models.JSONField(default=list, blank=True)
    is_mfa_enabled = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.username} ({self.role})"

    @property
    def unused_backup_codes_count(self):
        return self.backup_codes.filter(is_used=False).count()


class UserBackupCode(models.Model):
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='backup_codes')
    code_hash  = models.CharField(max_length=64, db_index=True)
    is_used    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    used_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['user', 'is_used']),
        ]

    def __str__(self):
        return f"BackupCode for {self.user.username} (Used: {self.is_used})"

class UserSession(models.Model):
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    token_hash = models.CharField(max_length=64, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen  = models.DateTimeField(auto_now=True)
    ip_address = models.GenericIPAddressField(null=True)
    device     = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"Session: {self.user.username}"


class UserActivityLog(models.Model):
    ACTION_CHOICES = [
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('FAILED_LOGIN', 'Failed Login'),
        ('SESSION_EXPIRED', 'Session Expired'),
        ('ADMIN_ACTION', 'Admin Action'),
        ('USER_CREATED', 'User Created'),
        ('USER_DELETED', 'User Deleted'),
        ('ROLE_CHANGED', 'Role Changed'),
        ('ACCOUNT_SUSPENDED', 'Account Suspended'),
        ('ACCOUNT_ACTIVATED', 'Account Activated'),
        ('PERMISSIONS_CHANGED', 'Permissions Changed'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    username = models.CharField(max_length=150)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['username']),
        ]

    def __str__(self):
        return f"{self.username} - {self.action} at {self.timestamp}"
