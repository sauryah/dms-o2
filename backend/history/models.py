from django.db import models
from django.conf import settings

class DieHistory(models.Model):
    die        = models.ForeignKey('dies.Die', on_delete=models.CASCADE, related_name='history')
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, db_index=True)
    timestamp  = models.DateTimeField(auto_now_add=True)
    field_name = models.CharField(max_length=50)
    old_value  = models.TextField()
    new_value  = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    note       = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes  = [
            models.Index(fields=['die', 'timestamp']),
            models.Index(fields=['timestamp']),
        ]

    def __str__(self):
        return f"History: {self.die.die_id} - {self.field_name}"


class MachineHistory(models.Model):
    ENTITY_CHOICES = [
        ('MACHINE', 'Machine'),
        ('SET', 'Set'),
        ('CATEGORY', 'Category'),
        ('RACK', 'Rack'),
    ]
    ACTION_CHOICES = [
        ('CREATED', 'Created'),
        ('UPDATED', 'Updated'),
        ('DELETED', 'Deleted'),
    ]

    entity_type = models.CharField(max_length=10, choices=ENTITY_CHOICES)
    entity_id   = models.IntegerField()
    entity_name = models.CharField(max_length=100)
    action      = models.CharField(max_length=10, choices=ACTION_CHOICES)
    field_name  = models.CharField(max_length=50, null=True, blank=True)
    old_value   = models.TextField(null=True, blank=True)
    new_value   = models.TextField(null=True, blank=True)
    changed_by  = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, db_index=True)
    timestamp   = models.DateTimeField(auto_now_add=True)
    ip_address  = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['timestamp']),
        ]

    def __str__(self):
        return f"MachineHistory: {self.entity_type} {self.entity_name} - {self.action}"


from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache

@receiver(post_save, sender=DieHistory)
@receiver(post_delete, sender=DieHistory)
def clear_dashboard_history_cache(sender, instance, **kwargs):
    cache.delete("dashboard_history_status_cache")
    cache.delete("dashboard_history_recent_cache")
