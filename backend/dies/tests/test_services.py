import os
import tempfile
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from dies.services.validation_service import ValidationService
from dies.services.import_service import ImportService
from dies.models import Die, RoundDie

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
        content = """die_id,die_type,casing,status,location,remarks,punched_size,current_size
R-SERV-1,ROUND,25x10,AVAILABLE,Rack D,rem,1.5,1.5
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
            self.assertEqual(die.location, 'Rack D')
            self.assertEqual(die.rounddie.current_size, Decimal('1.5'))
        finally:
            os.remove(temp_file_path)
