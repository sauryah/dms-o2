import re
from django.db import migrations

def migrate_locations(apps, schema_editor):
    Die = apps.get_model('dies', 'Die')
    Rack = apps.get_model('machines', 'Rack')
    
    # Match Rack <name> - Shelf <number> case-insensitively
    regex = re.compile(r'Rack\s+([A-Za-z0-9]+)\s*-\s*Shelf\s*([0-9]+)', re.IGNORECASE)
    
    for die in Die.objects.all():
        if not die.location:
            continue
        match = regex.search(die.location)
        if match:
            rack_name = match.group(1)
            try:
                shelf_num = int(match.group(2))
            except ValueError:
                continue
            
            rack, created = Rack.objects.get_or_create(
                name=rack_name,
                defaults={'row_count': 10, 'column_count': 10}
            )
            die.rack = rack
            die.shelf = shelf_num
            die.save(update_fields=['rack', 'shelf'])

def reverse_migrate_locations(apps, schema_editor):
    Die = apps.get_model('dies', 'Die')
    Die.objects.all().update(rack=None, shelf=None)

class Migration(migrations.Migration):

    dependencies = [
        ('dies', '0005_die_rack_die_shelf'),
        ('machines', '0002_rack'),
    ]

    operations = [
        migrations.RunPython(migrate_locations, reverse_migrate_locations),
    ]
