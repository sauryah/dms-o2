from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from history.models import DieHistory

class Command(BaseCommand):
    help = 'Prune old DieHistory records'

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
        records_to_prune = DieHistory.objects.filter(timestamp__lt=cutoff_date)
        count = records_to_prune.count()
        
        if options['dry_run']:
            self.stdout.write(self.style.SUCCESS(
                f"[DRY-RUN] Would prune {count} records older than {retention_days} days (cutoff: {cutoff_date})."
            ))
        else:
            deleted_count, _ = records_to_prune.delete()
            self.stdout.write(self.style.SUCCESS(
                f"Pruned {deleted_count} records older than {retention_days} days."
            ))
