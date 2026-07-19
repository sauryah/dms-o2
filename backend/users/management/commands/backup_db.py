import os
from django.core.management.base import BaseCommand
from users.services.backup_service import BackupService

class Command(BaseCommand):
    help = 'Consolidates database backup and pruning operations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--prune-only',
            action='store_true',
            help='Only prune old backups without creating a new one'
        )
        parser.add_argument(
            '--days',
            type=int,
            default=14,
            help='Prune backups older than this number of days (default: 14)'
        )

    def handle(self, *args, **options):
        days = options['days']
        if options['prune_only']:
            self.stdout.write(self.style.WARNING(f"Pruning backups older than {days} days..."))
            BackupService.prune_old_backups(days=days)
            self.stdout.write(self.style.SUCCESS("Pruning completed successfully."))
            return

        self.stdout.write(self.style.NOTICE("Starting database backup..."))
        try:
            filename = BackupService.create_backup()
            self.stdout.write(self.style.SUCCESS(f"Backup created successfully: {filename}"))
            self.stdout.write(self.style.NOTICE(f"Pruning backups older than {days} days..."))
            BackupService.prune_old_backups(days=days)
            self.stdout.write(self.style.SUCCESS("All backup operations completed successfully."))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Backup failed: {str(e)}"))
            raise e
