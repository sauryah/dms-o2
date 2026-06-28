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

    def __str__(self):
        return f"{self.username} ({self.role})"

class UserSession(models.Model):
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    token_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen  = models.DateTimeField(auto_now=True)
    ip_address = models.GenericIPAddressField(null=True)
    device     = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"Session: {self.user.username}"
