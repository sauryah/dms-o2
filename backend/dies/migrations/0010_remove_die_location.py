"""
Schema migration to remove the location field from Die model.
This migration runs after the data migration to populate rack and shelf_number.
"""
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('dies', '0009_populate_location_fields'),
    ]

    operations = [
        # Remove the location field
        migrations.RemoveField(
            model_name='die',
            name='location',
        ),
        # Remove the GIN index on location (trgm)
        migrations.RemoveIndex(
            model_name='die',
            name='die_location_trgm_idx',
        ),
    ]
