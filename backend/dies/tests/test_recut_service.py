from unittest.mock import patch, MagicMock
from decimal import Decimal
from django.test import TestCase, RequestFactory
from dies.services.recut_service import RecutService


class RecutServiceMockedTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.mock_die = MagicMock()
        self.mock_die.die_id = "R-TEST-1"
        self.mock_die.die_type = "ROUND"
        self.mock_die.status = "AVAILABLE"

        self.mock_user = MagicMock()
        self.mock_user.role = "ADMIN"
        self.mock_user.is_superuser = False

        # Patch Die and MaintenanceLog for all tests in this class
        self.die_patcher = patch('dies.services.recut_service.Die')
        self.mock_die_cls = self.die_patcher.start()
        self.mock_die_cls.objects.select_for_update.return_value.get.return_value = self.mock_die

        self.log_patcher = patch('dies.services.recut_service.MaintenanceLog')
        self.mock_log_cls = self.log_patcher.start()

    def tearDown(self):
        self.die_patcher.stop()
        self.log_patcher.stop()

    def test_recut_round_die_success(self):
        self.mock_die.rounddie = MagicMock()
        self.mock_die.rounddie.punched_size = Decimal("12.000")
        self.mock_die.rounddie.current_size = Decimal("11.800")

        data = {
            'new_size': '12.500',
            'note': 'Recut to restore size'
        }

        RecutService.recut_die(self.mock_die, self.mock_user, data)

        self.mock_die.rounddie.save.assert_called_once()
        self.mock_die.save.assert_called_once()
        self.mock_log_cls.objects.create.assert_called_once()

    def test_recut_requires_note(self):
        data = {'new_size': '12.500', 'note': ''}
        with self.assertRaises(ValueError) as ctx:
            RecutService.recut_die(self.mock_die, self.mock_user, data)
        self.assertIn('note', str(ctx.exception).lower())

    def test_recut_requires_admin_role(self):
        self.mock_user.role = "OPERATOR"
        data = {'new_size': '12.500', 'note': 'test'}
        with self.assertRaises(PermissionError):
            RecutService.recut_die(self.mock_die, self.mock_user, data)

    def test_recut_rejects_smaller_size(self):
        self.mock_die.rounddie = MagicMock()
        self.mock_die.rounddie.current_size = Decimal("12.000")
        data = {'new_size': '11.500', 'note': 'test'}
        with self.assertRaises(ValueError) as ctx:
            RecutService.recut_die(self.mock_die, self.mock_user, data)
        self.assertIn('greater', str(ctx.exception).lower())

    def test_recut_flat_die_success(self):
        self.mock_die.die_type = "FLAT"

        self.mock_die.flatdie = MagicMock()
        self.mock_die.flatdie.current_width = Decimal("30.000")
        self.mock_die.flatdie.current_thickness = Decimal("5.000")
        self.mock_die.flatdie.radius = Decimal("1.500")

        data = {
            'new_width': '30.500',
            'new_thickness': '5.200',
            'new_radius': '1.500',
            'note': 'Flat die recut'
        }

        RecutService.recut_die(self.mock_die, self.mock_user, data)

        self.mock_die.flatdie.save.assert_called_once()
        self.mock_die.save.assert_called_once()
        self.mock_log_cls.objects.create.assert_called_once()
