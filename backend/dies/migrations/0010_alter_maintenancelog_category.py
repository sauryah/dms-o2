from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dies', '0009_maintenancelog'),
    ]

    operations = [
        migrations.AlterField(
            model_name='maintenancelog',
            name='category',
            field=models.CharField(blank=True, choices=[('INSPECTION', 'Inspection'), ('REPAIR', 'Repair'), ('RECUT', 'Recut / Re-bore'), ('CLEANING', 'Cleaning'), ('POLISHING', 'Polishing'), ('MEASUREMENT', 'Measurement'), ('OTHER', 'Other')], max_length=30),
        ),
    ]
