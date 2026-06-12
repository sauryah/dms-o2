from django.db import models
from django.conf import settings

class DieHistory(models.Model):
    die        = models.ForeignKey('dies.Die', on_delete=models.CASCADE, related_name='history')
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    timestamp  = models.DateTimeField(auto_now_add=True)
    field_name = models.CharField(max_length=50)
    old_value  = models.TextField()
    new_value  = models.TextField()
    note       = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes  = [models.Index(fields=['die', 'timestamp'])]

    def __str__(self):
        return f"History: {self.die.die_id} - {self.field_name}"
