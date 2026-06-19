from django.db import models

STATUS_CHOICES = [
    ('AVAILABLE','Available'), ('RUNNING','Running'),
    ('CLEANING','Cleaning'), ('POLISHING','Polishing'),
    ('DAMAGED','Damaged'), ('SCRAPPED','Scrapped'), ('MISSING','Missing'),
    ('MAINTENANCE','Maintenance'), ('SCRAP','Scrap'),
]

class Die(models.Model):
    die_id      = models.CharField(max_length=50, unique=True)
    die_type    = models.CharField(max_length=10, choices=[('ROUND','Round'),('FLAT','Flat')])
    casing      = models.CharField(max_length=50)
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    location    = models.CharField(max_length=200, blank=True)  # e.g. "Rack A - Shelf 3"
    current_set = models.ForeignKey('machines.Set', null=True, blank=True, on_delete=models.SET_NULL)
    remarks     = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['casing']),
            models.Index(fields=['die_type']),
            models.Index(fields=['location']),
        ]

    def __str__(self):
        return f"{self.die_id} ({self.die_type})"

class RoundDie(models.Model):
    die           = models.OneToOneField(Die, on_delete=models.CASCADE, related_name='rounddie')
    original_size = models.DecimalField(max_digits=7, decimal_places=3)
    current_size  = models.DecimalField(max_digits=7, decimal_places=3)

    class Meta:
        indexes = [models.Index(fields=['current_size'])]

    def __str__(self):
        return f"RoundDie: {self.die.die_id} size {self.current_size}"

class FlatDie(models.Model):
    die                = models.OneToOneField(Die, on_delete=models.CASCADE, related_name='flatdie')
    original_width     = models.DecimalField(max_digits=7, decimal_places=3)
    current_width      = models.DecimalField(max_digits=7, decimal_places=3)
    original_thickness = models.DecimalField(max_digits=7, decimal_places=3)
    current_thickness  = models.DecimalField(max_digits=7, decimal_places=3)
    radius             = models.DecimalField(max_digits=7, decimal_places=3)

    class Meta:
        indexes = [models.Index(fields=['current_width', 'current_thickness'])]

    def __str__(self):
        return f"FlatDie: {self.die.die_id} {self.current_width}x{self.current_thickness}"
