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
    prev_hash  = models.CharField(max_length=64, blank=True, null=True)
    hash       = models.CharField(max_length=64, blank=True, null=True)

    class Meta:
        ordering = ['-timestamp']
        indexes  = [
            models.Index(fields=['die', 'timestamp']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['die', 'field_name', 'timestamp']),
        ]

    def save(self, *args, **kwargs):
        if not self.hash:
            import hashlib
            last_record = DieHistory.objects.filter(die=self.die).order_by('-id').first()
            p_hash = last_record.hash if (last_record and last_record.hash) else "0" * 64
            self.prev_hash = p_hash
            payload = f"{p_hash}:{self.die_id}:{self.changed_by_id or ''}:{self.field_name}:{self.old_value}:{self.new_value}"
            self.hash = hashlib.sha256(payload.encode('utf-8')).hexdigest()
        super().save(*args, **kwargs)

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
    prev_hash   = models.CharField(max_length=64, blank=True, null=True)
    hash        = models.CharField(max_length=64, blank=True, null=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['timestamp']),
        ]

    def save(self, *args, **kwargs):
        if not self.hash:
            import hashlib
            last_record = MachineHistory.objects.filter(entity_type=self.entity_type, entity_id=self.entity_id).order_by('-id').first()
            p_hash = last_record.hash if (last_record and last_record.hash) else "0" * 64
            self.prev_hash = p_hash
            payload = f"{p_hash}:{self.entity_type}:{self.entity_id}:{self.action}:{self.field_name or ''}:{self.old_value or ''}:{self.new_value or ''}:{self.changed_by_id or ''}"
            self.hash = hashlib.sha256(payload.encode('utf-8')).hexdigest()
        super().save(*args, **kwargs)

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
