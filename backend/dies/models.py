from django.db import models
from django.contrib.postgres.indexes import GinIndex
from dies.contracts import DIE_STATUS_CHOICES, DIE_TYPE_CHOICES

class Die(models.Model):
    die_id      = models.CharField(max_length=50, unique=True)
    die_type    = models.CharField(max_length=10, choices=DIE_TYPE_CHOICES)
    casing      = models.CharField(max_length=50)
    status      = models.CharField(max_length=20, choices=DIE_STATUS_CHOICES, default='AVAILABLE')
    location    = models.CharField(max_length=200, blank=True)  # e.g. "Rack A - Shelf 3"
    rack        = models.ForeignKey('machines.Rack', null=True, blank=True, on_delete=models.SET_NULL)
    shelf       = models.PositiveSmallIntegerField(null=True, blank=True)
    current_set = models.ForeignKey('machines.Set', null=True, blank=True, on_delete=models.SET_NULL)
    remarks     = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)
    version     = models.IntegerField(default=1)

    class Meta:
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['die_type']),
            GinIndex(name='die_location_trgm_idx', fields=['location'], opclasses=['gin_trgm_ops']),
            GinIndex(name='die_casing_trgm_idx', fields=['casing'], opclasses=['gin_trgm_ops']),
        ]

    def __str__(self):
        return f"{self.die_id} ({self.die_type})"

class RoundDie(models.Model):
    die           = models.OneToOneField(Die, on_delete=models.CASCADE, related_name='rounddie')
    punched_size  = models.DecimalField(max_digits=7, decimal_places=3)
    current_size  = models.DecimalField(max_digits=7, decimal_places=3)

    class Meta:
        indexes = [models.Index(fields=['current_size'])]

    def __str__(self):
        return f"RoundDie: {self.die.die_id} size {self.current_size}"

class FlatDie(models.Model):
    die                = models.OneToOneField(Die, on_delete=models.CASCADE, related_name='flatdie')
    punched_width      = models.DecimalField(max_digits=7, decimal_places=3)
    current_width      = models.DecimalField(max_digits=7, decimal_places=3)
    punched_thickness  = models.DecimalField(max_digits=7, decimal_places=3)
    current_thickness  = models.DecimalField(max_digits=7, decimal_places=3)
    radius             = models.DecimalField(max_digits=7, decimal_places=3)

    class Meta:
        indexes = [models.Index(fields=['current_width', 'current_thickness'])]

    def __str__(self):
        return f"FlatDie: {self.die.die_id} {self.current_width}x{self.current_thickness}"


from django.conf import settings

class MaintenanceLog(models.Model):
    die        = models.ForeignKey(Die, on_delete=models.CASCADE, related_name='maintenance_logs')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    note       = models.TextField()
    category   = models.CharField(max_length=30, blank=True, choices=[
        ('INSPECTION', 'Inspection'),
        ('REPAIR', 'Repair'),
        ('RECUT', 'Recut / Re-bore'),
        ('CLEANING', 'Cleaning'),
        ('POLISHING', 'Polishing'),
        ('MEASUREMENT', 'Measurement'),
        ('OTHER', 'Other'),
    ])

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Maintenance: {self.die.die_id} - {self.get_category_display()} ({self.created_at.date()})"


class ImportLog(models.Model):
    imported_by   = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    imported_at   = models.DateTimeField(auto_now_add=True)
    filename      = models.CharField(max_length=255)
    created_count = models.IntegerField()
    updated_count = models.IntegerField()
    skipped_count = models.IntegerField()
    error_count   = models.IntegerField()
    errors_json   = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ['-imported_at']

    def __str__(self):
        return f"ImportLog: {self.filename} by {self.imported_by} at {self.imported_at}"


class DieTolerance(models.Model):
    die_type = models.CharField(max_length=10, choices=DIE_TYPE_CHOICES, unique=True)
    max_wear_mm = models.DecimalField(max_digits=5, decimal_places=3, default=0.050)
    warning_percentage = models.IntegerField(default=70) # Alert at 70% wear
    critical_percentage = models.IntegerField(default=90) # Alert at 90% wear

    def __str__(self):
        return f"Tolerance for {self.die_type}: Max {self.max_wear_mm}mm"


class WearAlert(models.Model):
    ALERT_LEVEL_CHOICES = (
        ('WARNING', 'Warning'),
        ('CRITICAL', 'Critical'),
    )
    die = models.ForeignKey(Die, on_delete=models.CASCADE, related_name='wear_alerts')
    alert_level = models.CharField(max_length=15, choices=ALERT_LEVEL_CHOICES)
    message = models.TextField()
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        status = "Resolved" if self.is_resolved else "Active"
        return f"WearAlert [{status}] - {self.die.die_id} ({self.alert_level})"


class OutboxTask(models.Model):
    task_type    = models.CharField(max_length=50)  # e.g., 'SYNC_DIE' or 'DELETE_DIE'
    payload      = models.JSONField()
    payload_hash = models.CharField(max_length=64, blank=True, default='')  # SHA-256 integrity check
    is_processed = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.payload_hash and self.payload:
            import json, hmac, hashlib
            from django.conf import settings
            serialized = json.dumps(self.payload, sort_keys=True)
            self.payload_hash = hmac.new(
                settings.SECRET_KEY.encode('utf-8'),
                serialized.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"OutboxTask {self.task_type} - Processed: {self.is_processed}"
