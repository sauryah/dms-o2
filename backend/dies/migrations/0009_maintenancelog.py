from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0001_initial'),
        ('dies', '0008_rename_original_thickness_flatdie_punched_thickness_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='MaintenanceLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('note', models.TextField()),
                ('category', models.CharField(blank=True, choices=[('INSPECTION', 'Inspection'), ('REPAIR', 'Repair'), ('CLEANING', 'Cleaning'), ('POLISHING', 'Polishing'), ('MEASUREMENT', 'Measurement'), ('OTHER', 'Other')], max_length=30)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='users.user')),
                ('die', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='maintenance_logs', to='dies.die')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
