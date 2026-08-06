from django.core.management.base import BaseCommand
from dies.tasks import check_all_wear_alerts_task

class Command(BaseCommand):
    help = 'Evaluate wear alerts and predictions for all active dies in the inventory'

    def handle(self, *args, **options):
        self.stdout.write("Running automated wear alert and prediction engine...")
        res = check_all_wear_alerts_task()
        count = res.get('checked_count', 0)
        self.stdout.write(self.style.SUCCESS(f"Successfully evaluated wear alerts and predictions for {count} active dies."))
