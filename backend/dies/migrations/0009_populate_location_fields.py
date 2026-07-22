"""
Data migration to populate rack and shelf_number from location field.
This migration runs before the location field is removed.
"""
from django.db import migrations


def parse_location_to_rack_shelf(apps, schema_editor):
    """
    Parse location strings like "Rack A - Shelf 3" to populate rack and shelf_number.
    """
    Die = apps.get_model('dies', 'Die')
    Rack = apps.get_model('machines', 'Rack')
    
    # Get all dies with location set but rack not set
    dies_to_migrate = Die.objects.filter(
        location__isnull=False,
        location__gt='',
        rack__isnull=True
    )
    
    for die in dies_to_migrate:
        location = die.location.strip()
        if not location:
            continue
        
        # Try to parse "Rack X - Shelf Y" format
        rack_name = None
        shelf_number = None
        
        # Common patterns:
        # "Rack A - Shelf 3"
        # "Rack-A Shelf 3"
        # "Rack A, Shelf 3"
        # "A-3" (simplified)
        
        location_lower = location.lower()
        
        # Try "Rack <name> - Shelf <number>" pattern
        import re
        patterns = [
            r'rack\s+([a-zA-Z0-9]+)\s*[-,]\s*shelf\s+(\d+)',
            r'rack\s+([a-zA-Z0-9]+)\s+(\d+)',
            r'^([a-zA-Z0-9]+)\s*[-,]\s*(\d+)$',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, location_lower)
            if match:
                rack_name = match.group(1).upper()
                try:
                    shelf_number = int(match.group(2))
                except ValueError:
                    continue
                break
        
        if rack_name and shelf_number:
            # Get or create rack
            rack, created = Rack.objects.get_or_create(
                name=rack_name,
                defaults={
                    'row_count': 10,  # Default, will need manual update
                    'column_count': 10
                }
            )
            
            # Update die
            die.rack = rack
            die.shelf_number = shelf_number
            die.save(update_fields=['rack', 'shelf_number'])
            
            print(f"Migrated die {die.die_id}: location '{location}' -> rack '{rack_name}', shelf {shelf_number}")
        else:
            print(f"Could not parse location '{location}' for die {die.die_id}")


def reverse_migration(apps, schema_editor):
    """
    Reverse migration: populate location from rack and shelf_number.
    """
    Die = apps.get_model('dies', 'Die')
    
    dies_to_migrate = Die.objects.filter(
        rack__isnull=False,
        shelf_number__isnull=False
    )
    
    for die in dies_to_migrate:
        location = f"Rack {die.rack.name} - Shelf {die.shelf_number}"
        die.location = location
        die.save(update_fields=['location'])
        print(f"Reversed die {die.die_id}: rack '{die.rack.name}', shelf {die.shelf_number} -> location '{location}'")


class Migration(migrations.Migration):
    dependencies = [
        ('dies', '0008_die_predicted_remaining_days'),
        ('machines', '__first__'),
    ]

    operations = [
        migrations.RunPython(parse_location_to_rack_shelf, reverse_migration),
    ]
