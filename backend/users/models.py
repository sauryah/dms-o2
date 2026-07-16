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

    def __str__(self):
        return f"{self.username} ({self.role})"

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
