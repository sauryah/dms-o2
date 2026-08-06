from decimal import Decimal
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.core.management import call_command
from io import StringIO
from dies.models import Die, RoundDie, FlatDie, WearAlert
from history.models import DieHistory
from dies.services.wear_prediction_service import WearPredictionService
from dies.services.wear_alert_service import WearAlertService
from dies.tasks import check_all_wear_alerts_task


class WearPredictionServiceTests(TestCase):
    def setUp(self):
        self.round_die = Die.objects.create(
            die_id='PRED-R-01',
            die_type='ROUND',
            casing='Standard Round'
        )
        self.r_detail = RoundDie.objects.create(
            die=self.round_die,
            punched_size=Decimal('10.000'),
            current_size=Decimal('10.000')
        )

        self.flat_die = Die.objects.create(
            die_id='PRED-F-01',
            die_type='FLAT',
            casing='Standard Flat'
        )
        self.f_detail = FlatDie.objects.create(
            die=self.flat_die,
            punched_width=Decimal('20.000'),
            current_width=Decimal('20.000'),
            punched_thickness=Decimal('2.000'),
            current_thickness=Decimal('2.000')
        )

    def test_predict_round_die_initial(self):
        pred = WearPredictionService.predict_die(self.round_die)
        self.assertEqual(pred['die_id'], 'PRED-R-01')
        self.assertEqual(pred['die_type'], 'ROUND')
        self.assertEqual(pred['alert_level'], 'GOOD')
        self.assertEqual(pred['overall_wear_percentage'], 0.0)

    def test_predict_round_die_with_history(self):
        now = timezone.now()
        t1 = now - timedelta(days=10)
        t2 = now - timedelta(days=5)

        # Create history entries simulating wear progression
        DieHistory.objects.create(
            die=self.round_die,
            field_name='current_size',
            old_value='10.000',
            new_value='10.010',
            timestamp=t1
        )
        DieHistory.objects.create(
            die=self.round_die,
            field_name='current_size',
            old_value='10.010',
            new_value='10.020',
            timestamp=t2
        )
        self.r_detail.current_size = Decimal('10.030')
        self.r_detail.save()

        pred = WearPredictionService.predict_die(self.round_die)
        self.assertIsNotNone(pred['overall_remaining_days'])
        self.assertGreater(pred['overall_remaining_days'], 0)
        self.assertIn(pred['alert_level'], ['GOOD', 'WARNING', 'CRITICAL'])

    def test_predict_flat_die_prediction(self):
        now = timezone.now()
        t1 = now - timedelta(days=10)

        DieHistory.objects.create(
            die=self.flat_die,
            field_name='current_width',
            old_value='20.000',
            new_value='20.050',
            timestamp=t1
        )
        self.f_detail.current_width = Decimal('20.080')
        self.f_detail.save()

        pred = WearPredictionService.predict_die(self.flat_die)
        self.assertEqual(pred['die_id'], 'PRED-F-01')
        self.assertIn('width', pred['dimensions'])
        self.assertIn('thickness', pred['dimensions'])

    def test_check_all_wear_alerts_task(self):
        res = check_all_wear_alerts_task()
        self.assertEqual(res['status'], 'success')
        self.assertGreaterEqual(res['checked_count'], 2)

        self.round_die.refresh_from_db()
        self.assertIsNotNone(self.round_die.predicted_remaining_days)

    def test_check_wear_alerts_management_command(self):
        out = StringIO()
        call_command('check_wear_alerts', stdout=out)
        output = out.getvalue()
        self.assertIn("Running automated wear alert and prediction engine", output)
        self.assertIn("Successfully evaluated wear alerts and predictions", output)
