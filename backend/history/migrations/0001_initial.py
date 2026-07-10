from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('dies', '0001_initial'),
    ]

    replaces = [
        ('history', '0002_diehistory_ip_address'),
        ('history', '0003_diehistory_history_die_timesta_55e75c_idx'),
        ('history', '0004_machinehistory'),
    ]

    operations = [
        migrations.CreateModel(
            name='DieHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('field_name', models.CharField(max_length=50)),
                ('old_value', models.TextField()),
                ('new_value', models.TextField()),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('note', models.TextField(blank=True)),
                ('changed_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('die', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='history', to='dies.die')),
            ],
            options={
                'ordering': ['-timestamp'],
            },
        ),
        migrations.CreateModel(
            name='MachineHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('entity_type', models.CharField(choices=[('MACHINE', 'Machine'), ('SET', 'Set'), ('CATEGORY', 'Category')], max_length=10)),
                ('entity_id', models.IntegerField()),
                ('entity_name', models.CharField(max_length=100)),
                ('action', models.CharField(choices=[('CREATED', 'Created'), ('UPDATED', 'Updated'), ('DELETED', 'Deleted')], max_length=10)),
                ('field_name', models.CharField(blank=True, max_length=50, null=True)),
                ('old_value', models.TextField(blank=True, null=True)),
                ('new_value', models.TextField(blank=True, null=True)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('changed_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-timestamp'],
            },
        ),
        migrations.AddIndex(
            model_name='machinehistory',
            index=models.Index(fields=['entity_type', 'entity_id'], name='history_mac_entity__30e22d_idx'),
        ),
        migrations.AddIndex(
            model_name='machinehistory',
            index=models.Index(fields=['timestamp'], name='history_mac_timesta_72b743_idx'),
        ),
        migrations.AddIndex(
            model_name='diehistory',
            index=models.Index(fields=['die', 'timestamp'], name='history_die_die_id_747122_idx'),
        ),
        migrations.AddIndex(
            model_name='diehistory',
            index=models.Index(fields=['timestamp'], name='history_die_timesta_55e75c_idx'),
        ),
    ]
