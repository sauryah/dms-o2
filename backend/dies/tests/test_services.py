import os
import tempfile
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from dies.services.validation_service import ValidationService
from dies.services.import_service import ImportService
from dies.models import Die, RoundDie
from machines.models import Rack

User = get_user_model()

class ValidationServiceTests(TestCase):
    def test_validate_die_type_valid(self):
        self.assertEqual(ValidationService.validate_die_type("round"), "ROUND")
        self.assertEqual(ValidationService.validate_die_type("  Flat  "), "FLAT")

    def test_validate_die_type_invalid(self):
        with self.assertRaises(ValueError):
            ValidationService.validate_die_type("hexagonal")
        with self.assertRaises(ValueError):
            ValidationService.validate_die_type("")

    def test_validate_status_valid(self):
        self.assertEqual(ValidationService.validate_status("available"), "AVAILABLE")
        self.assertEqual(ValidationService.validate_status("cleaning"), "CLEANING")
        self.assertEqual(ValidationService.validate_status(None), "AVAILABLE")

    def test_validate_status_invalid(self):
        with self.assertRaises(ValueError):
            ValidationService.validate_status("STUCK_IN_PRESS")

    def test_validate_decimal_valid(self):
        self.assertEqual(ValidationService.validate_decimal("2.5", "test_field"), Decimal("2.5"))
        self.assertEqual(ValidationService.validate_decimal(15, "test_field"), Decimal("15"))

    def test_validate_decimal_invalid(self):
        with self.assertRaises(ValueError):
            ValidationService.validate_decimal("abc", "test_field")
        with self.assertRaises(ValueError):
            ValidationService.validate_decimal(None, "test_field")

    def test_validate_die_id_valid(self):
        self.assertEqual(ValidationService.validate_die_id("AL-F/1-05"), "AL-F/1-05")
        self.assertEqual(ValidationService.validate_die_id("R-101.A_B-C"), "R-101.A_B-C")

    def test_validate_die_id_invalid(self):
        with self.assertRaises(ValueError):
            ValidationService.validate_die_id("AL-F#1-05")
        with self.assertRaises(ValueError):
            ValidationService.validate_die_id("AL-F?1-05")
        with self.assertRaises(ValueError):
            ValidationService.validate_die_id("")


class ImportServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='tester_service',
            password='password123',
            role='ADMIN'
        )

    def test_import_dies_service_directly(self):
        rack = Rack.objects.create(name="Rack D", row_count=4, column_count=3)
        content = """die_id,die_type,casing,status,rack,shelf_number,remarks,punched_size,current_size
R-SERV-1,ROUND,25x10,AVAILABLE,Rack D,1,rem,1.5,1.5
"""
        with tempfile.NamedTemporaryFile(suffix='.csv', delete=False, mode='w', encoding='utf-8') as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name

        try:
            res = ImportService.import_dies(temp_file_path, '.csv', self.user)
            self.assertEqual(res['created'], 1)
            self.assertEqual(res['updated'], 0)
            self.assertEqual(len(res['errors']), 0)

            # Check database state
            die = Die.objects.get(die_id='R-SERV-1')
            self.assertEqual(die.status, 'AVAILABLE')
            self.assertEqual(die.rack, rack)
            self.assertEqual(die.shelf_number, 1)
            self.assertEqual(die.rounddie.current_size, Decimal('1.5'))
        finally:
            os.remove(temp_file_path)


from dies.models import FlatDie, DieTolerance, WearAlert
from dies.services.wear_alert_service import WearAlertService

class WearAlertServiceTests(TestCase):
    def setUp(self):
        # Create standard test dies
        self.round_die = Die.objects.create(
            die_id='TEST-R-100',
            die_type='ROUND',
            casing='Round Casing'
        )
        self.r_detail = RoundDie.objects.create(
            die=self.round_die,
            punched_size=Decimal('10.000'),
            current_size=Decimal('10.000')
        )
        
        self.flat_die = Die.objects.create(
            die_id='TEST-F-100',
            die_type='FLAT',
            casing='Flat Casing'
        )
        self.f_detail = FlatDie.objects.create(
            die=self.flat_die,
            punched_width=Decimal('50.000'),
            current_width=Decimal('50.000'),
            punched_thickness=Decimal('5.000'),
            current_thickness=Decimal('5.000'),
            radius=Decimal('0.500')
        )

    def test_default_tolerances_creation(self):
        # Retrieve tolerance when none exists
        tol = WearAlertService.get_or_create_default_tolerance('ROUND')
        self.assertEqual(tol.max_wear_mm, Decimal('0.050'))
        self.assertEqual(tol.warning_percentage, 70)
        self.assertEqual(tol.critical_percentage, 90)

    def test_no_alert_for_normal_wear(self):
        # Under normal size, no alerts should be logged
        WearAlertService.check_wear_alerts(self.round_die)
        self.assertEqual(WearAlert.objects.filter(die=self.round_die).count(), 0)

    def test_warning_alert_triggered(self):
        # Round default tolerance is 0.050mm. 70% threshold is 0.035mm.
        # Set wear to 0.040mm (10.040 - 10.000)
        self.r_detail.current_size = Decimal('10.040')
        self.r_detail.save()
        
        self.assertEqual(WearAlert.objects.filter(die=self.round_die, is_resolved=False).count(), 1)
        alert = WearAlert.objects.get(die=self.round_die, is_resolved=False)
        self.assertEqual(alert.alert_level, 'WARNING')

    def test_critical_alert_triggered(self):
        # Set wear to 0.048mm (10.048 - 10.000) -> 96% of 0.050mm (Critical)
        self.r_detail.current_size = Decimal('10.048')
        self.r_detail.save()
        
        self.assertEqual(WearAlert.objects.filter(die=self.round_die, is_resolved=False).count(), 1)
        alert = WearAlert.objects.get(die=self.round_die, is_resolved=False)
        self.assertEqual(alert.alert_level, 'CRITICAL')

    def test_alert_escalation_and_resolution(self):
        # 1. Trigger Warning
        self.r_detail.current_size = Decimal('10.040')
        self.r_detail.save()
        self.assertEqual(WearAlert.objects.filter(die=self.round_die, is_resolved=False).count(), 1)
        
        # 2. Trigger Critical (should resolve Warning and create Critical)
        self.r_detail.current_size = Decimal('10.048')
        self.r_detail.save()
        self.assertEqual(WearAlert.objects.filter(die=self.round_die, is_resolved=False).count(), 1)
        self.assertEqual(WearAlert.objects.filter(die=self.round_die, is_resolved=True).count(), 1)
        active = WearAlert.objects.get(die=self.round_die, is_resolved=False)
        self.assertEqual(active.alert_level, 'CRITICAL')
        
        # 3. Resolve (recut size reset to nominal)
        self.r_detail.current_size = Decimal('10.000')
        self.r_detail.save()
        self.assertEqual(WearAlert.objects.filter(die=self.round_die, is_resolved=False).count(), 0)
        self.assertEqual(WearAlert.objects.filter(die=self.round_die, is_resolved=True).count(), 2)

    def test_custom_tolerance_db_config(self):
        # Configure custom tolerance for Flat dies: max_wear = 0.200mm, warning at 50% (0.100mm)
        DieTolerance.objects.update_or_create(
            die_type='FLAT',
            defaults={
                'max_wear_mm': Decimal('0.200'),
                'warning_percentage': 50,
                'critical_percentage': 80
            }
        )
        
        # 1. Set wear below warning threshold (wear = 0.080mm)
        self.f_detail.current_width = Decimal('50.080')
        self.f_detail.save()
        self.assertEqual(WearAlert.objects.filter(die=self.flat_die).count(), 0)
        
        # 2. Set wear to warning (wear = 0.120mm -> 60%)
        self.f_detail.current_width = Decimal('50.120')
        self.f_detail.save()
        self.assertEqual(WearAlert.objects.filter(die=self.flat_die, is_resolved=False).count(), 1)
        alert = WearAlert.objects.get(die=self.flat_die, is_resolved=False)
        self.assertEqual(alert.alert_level, 'WARNING')
