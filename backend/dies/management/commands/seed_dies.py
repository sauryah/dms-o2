import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from dies.models import Die, RoundDie, FlatDie

class Command(BaseCommand):
    help = 'Seeds the database with random dies for testing'

    def handle(self, *args, **options):
        # Sample data options
        casings = ['Casing-A', 'Casing-B', 'Casing-C', 'Standard-Casing', 'Heavy-Duty-Casing']
        statuses = ['AVAILABLE', 'RUNNING', 'CLEANING', 'POLISHING', 'DAMAGED', 'MAINTENANCE']
        locations = [
            'Rack A - Shelf 1', 'Rack A - Shelf 2', 'Rack B - Shelf 1', 
            'Rack B - Shelf 3', 'Polish Room - Station 2', 'Maintenance Bay 1',
            'Storage Room 102', 'Machine Shop Floor'
        ]
        remarks_options = [
            'Excellent condition, ready for service.',
            'Requires polishing soon.',
            'Minor wear observed on edges.',
            'Polished recently.',
            'Undergoing scheduled inspection.',
            ''
        ]

        self.stdout.write('Deleting existing test dies...')
        # Delete only dies that start with "TEST-" to avoid wiping actual user data
        deleted_count, _ = Die.objects.filter(die_id__startswith='TEST-').delete()
        self.stdout.write(f'Deleted {deleted_count} old test dies.')

        self.stdout.write('Creating 15 random test dies...')
        created_count = 0

        # Generate 8 Round Dies
        for i in range(1, 9):
            die_id = f"TEST-R-{1000 + i}"
            die = Die.objects.create(
                die_id=die_id,
                die_type='ROUND',
                casing=random.choice(casings),
                status=random.choice(statuses),
                location=random.choice(locations),
                remarks=random.choice(remarks_options)
            )
            orig_size = round(random.uniform(5.0, 50.0), 3)
            curr_size = round(orig_size - random.uniform(0.0, 0.5), 3)
            
            RoundDie.objects.create(
                die=die,
                original_size=Decimal(str(orig_size)),
                current_size=Decimal(str(curr_size))
            )
            created_count += 1

        # Generate 7 Flat Dies
        for i in range(1, 8):
            die_id = f"TEST-F-{2000 + i}"
            die = Die.objects.create(
                die_id=die_id,
                die_type='FLAT',
                casing=random.choice(casings),
                status=random.choice(statuses),
                location=random.choice(locations),
                remarks=random.choice(remarks_options)
            )
            orig_w = round(random.uniform(10.0, 100.0), 3)
            curr_w = round(orig_w - random.uniform(0.0, 1.0), 3)
            orig_t = round(random.uniform(2.0, 20.0), 3)
            curr_t = round(orig_t - random.uniform(0.0, 0.5), 3)
            radius = round(random.uniform(0.1, 5.0), 3)

            FlatDie.objects.create(
                die=die,
                original_width=Decimal(str(orig_w)),
                current_width=Decimal(str(curr_w)),
                original_thickness=Decimal(str(orig_t)),
                current_thickness=Decimal(str(curr_t)),
                radius=Decimal(str(radius))
            )
            created_count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully created {created_count} random test dies.'))
