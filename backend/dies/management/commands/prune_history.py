from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from history.models import DieHistory, MachineHistory

class Command(BaseCommand):
    help = 'Prune old DieHistory and MachineHistory records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print the count of records that would be deleted, without actually deleting them',
        )

    def handle(self, *args, **options):
        retention_days = settings.HISTORY_RETENTION_DAYS
        cutoff_date = timezone.now() - timedelta(days=retention_days)
        
        # Query records older than cutoff_date
        die_records = DieHistory.objects.filter(timestamp__lt=cutoff_date)
        machine_records = MachineHistory.objects.filter(timestamp__lt=cutoff_date)
        die_count = die_records.count()
        machine_count = machine_records.count()
        total_count = die_count + machine_count
        
        if options['dry_run']:
            self.stdout.write(self.style.SUCCESS(
                f"[DRY-RUN] Would prune {total_count} records older than {retention_days} days "
                f"(DieHistory: {die_count}, MachineHistory: {machine_count}). cutoff: {cutoff_date}."
            ))
        else:
            die_deleted, _ = die_records.delete()
            machine_deleted, _ = machine_records.delete()
            self.stdout.write(self.style.SUCCESS(
                f"Pruned {die_deleted + machine_deleted} records older than {retention_days} days "
                f"(DieHistory: {die_deleted}, MachineHistory: {machine_deleted})."
            ))
