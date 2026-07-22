from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from django.core.management import call_command
from django.conf import settings
from io import StringIO
from dies.models import Die
from history.models import DieHistory

class PruneHistoryTests(TestCase):
    def setUp(self):
        self.die = Die.objects.create(
            die_id="PRUNE-TEST",
            die_type="ROUND",
            casing="20x20",
            status="AVAILABLE",
        )

        # 1. Create a fresh record (within retention window)
        self.fresh_history = DieHistory.objects.create(
            die=self.die,
            field_name="status",
            old_value="AVAILABLE",
            new_value="RUNNING",
        )

        # 2. Create an old record (outside retention window)
        self.old_history = DieHistory.objects.create(
            die=self.die,
            field_name="rack_id",
            old_value="1",
            new_value="2",
        )

        # Artificially age the old history record (e.g. 400 days old)
        retention_days = settings.HISTORY_RETENTION_DAYS
        old_time = timezone.now() - timedelta(days=retention_days + 10)
        DieHistory.objects.filter(pk=self.old_history.pk).update(timestamp=old_time)

    def test_prune_history_dry_run(self):
        out = StringIO()
        call_command('prune_history', '--dry-run', stdout=out)
        output = out.getvalue()

        self.assertIn("Would prune 1 records", output)
        # Verify no records were actually deleted
        self.assertTrue(DieHistory.objects.filter(pk=self.old_history.pk).exists())
        self.assertTrue(DieHistory.objects.filter(pk=self.fresh_history.pk).exists())

    def test_prune_history_execute(self):
        out = StringIO()
        call_command('prune_history', stdout=out)
        output = out.getvalue()

        self.assertIn("Pruned 1 records", output)
        # Verify old record is deleted
        self.assertFalse(DieHistory.objects.filter(pk=self.old_history.pk).exists())
        # Verify fresh record is not deleted
        self.assertTrue(DieHistory.objects.filter(pk=self.fresh_history.pk).exists())
