from django.conf import settings
import django.contrib.postgres.indexes
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.postgres.operations import TrigramExtension

class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('machines', '0001_initial'),
        ('users', '0001_initial'),
    ]

    replaces = [
        ('dies', '0002_alter_die_status'),
        ('dies', '0003_remove_die_dies_die_casing_63f282_idx_and_more'),
        ('dies', '0004_alter_die_status'),
        ('dies', '0005_die_rack_die_shelf'),
        ('dies', '0006_migrate_locations'),
        ('dies', '0007_importlog'),
        ('dies', '0008_rename_original_thickness_flatdie_punched_thickness_and_more'),
        ('dies', '0009_maintenancelog'),
        ('dies', '0010_alter_maintenancelog_category'),
    ]

    operations = [
        TrigramExtension(),
        migrations.CreateModel(
            name='Die',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('die_id', models.CharField(max_length=50, unique=True)),
                ('die_type', models.CharField(choices=[('ROUND', 'Round'), ('FLAT', 'Flat')], max_length=10)),
                ('casing', models.CharField(max_length=50)),
                ('status', models.CharField(choices=[('AVAILABLE', 'Available'), ('RUNNING', 'Running'), ('CLEANING', 'Cleaning'), ('POLISHING', 'Polishing'), ('DAMAGED', 'Damaged'), ('SCRAPPED', 'Scrapped'), ('MISSING', 'Missing'), ('MAINTENANCE', 'Maintenance')], default='AVAILABLE', max_length=20)),
                ('location', models.CharField(blank=True, max_length=200)),
                ('shelf', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('remarks', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('current_set', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='machines.set')),
                ('rack', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='machines.rack')),
            ],
        ),
        migrations.CreateModel(
            name='FlatDie',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('punched_width', models.DecimalField(decimal_places=3, max_digits=7)),
                ('current_width', models.DecimalField(decimal_places=3, max_digits=7)),
                ('punched_thickness', models.DecimalField(decimal_places=3, max_digits=7)),
                ('current_thickness', models.DecimalField(decimal_places=3, max_digits=7)),
                ('radius', models.DecimalField(decimal_places=3, max_digits=7)),
                ('die', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='flatdie', to='dies.die')),
            ],
        ),
        migrations.CreateModel(
            name='ImportLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('imported_at', models.DateTimeField(auto_now_add=True)),
                ('filename', models.CharField(max_length=255)),
                ('created_count', models.IntegerField()),
                ('updated_count', models.IntegerField()),
                ('skipped_count', models.IntegerField()),
                ('error_count', models.IntegerField()),
                ('errors_json', models.JSONField(blank=True, null=True)),
                ('imported_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-imported_at'],
            },
        ),
        migrations.CreateModel(
            name='MaintenanceLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('note', models.TextField()),
                ('category', models.CharField(blank=True, choices=[('INSPECTION', 'Inspection'), ('REPAIR', 'Repair'), ('RECUT', 'Recut / Re-bore'), ('CLEANING', 'Cleaning'), ('POLISHING', 'Polishing'), ('MEASUREMENT', 'Measurement'), ('OTHER', 'Other')], max_length=30)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('die', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='maintenance_logs', to='dies.die')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='RoundDie',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('punched_size', models.DecimalField(decimal_places=3, max_digits=7)),
                ('current_size', models.DecimalField(decimal_places=3, max_digits=7)),
                ('die', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='rounddie', to='dies.die')),
            ],
        ),
        migrations.AddIndex(
            model_name='rounddie',
            index=models.Index(fields=['current_size'], name='dies_roundd_current_33f836_idx'),
        ),
        migrations.AddIndex(
            model_name='flatdie',
            index=models.Index(fields=['current_width', 'current_thickness'], name='dies_flatdi_current_97e58b_idx'),
        ),
        migrations.AddIndex(
            model_name='die',
            index=models.Index(fields=['status'], name='dies_die_status_ee1f73_idx'),
        ),
        migrations.AddIndex(
            model_name='die',
            index=models.Index(fields=['die_type'], name='dies_die_die_typ_0c1a97_idx'),
        ),
        migrations.AddIndex(
            model_name='die',
            index=django.contrib.postgres.indexes.GinIndex(fields=['location'], name='die_location_trgm_idx', opclasses=['gin_trgm_ops']),
        ),
        migrations.AddIndex(
            model_name='die',
            index=django.contrib.postgres.indexes.GinIndex(fields=['casing'], name='die_casing_trgm_idx', opclasses=['gin_trgm_ops']),
        ),
    ]
