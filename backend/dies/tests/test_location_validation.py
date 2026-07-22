"""
Tests for location validation in dies module.
"""
from django.test import TestCase
from machines.models import Rack
from dies.services.validation_service import ValidationService


class TestLocationValidation(TestCase):
    """Test location validation logic."""
    
    def setUp(self):
        """Create test rack."""
        self.rack = Rack.objects.create(
            name='A',
            row_count=5,
            column_count=10
        )
    
    def test_validate_location_both_none(self):
        """Test validation when both rack and shelf_number are None."""
        rack, shelf = ValidationService.validate_location(None, None)
        self.assertIsNone(rack)
        self.assertIsNone(shelf)
    
    def test_validate_location_rack_only(self):
        """Test validation when rack is provided but shelf_number is None."""
        with self.assertRaises(ValueError) as context:
            ValidationService.validate_location(self.rack, None)
        self.assertIn('shelf_number is required', str(context.exception))
    
    def test_validate_location_shelf_only(self):
        """Test validation when shelf_number is provided but rack is None."""
        with self.assertRaises(ValueError) as context:
            ValidationService.validate_location(None, 1)
        self.assertIn('rack is required', str(context.exception))
    
    def test_validate_location_valid(self):
        """Test validation with valid rack and shelf_number."""
        rack, shelf = ValidationService.validate_location(self.rack, 1)
        self.assertEqual(rack, self.rack)
        self.assertEqual(shelf, 1)
    
    def test_validate_location_max_slot(self):
        """Test validation with maximum valid shelf_number (50 for 5x10 rack)."""
        rack, shelf = ValidationService.validate_location(self.rack, 50)
        self.assertEqual(rack, self.rack)
        self.assertEqual(shelf, 50)
    
    def test_validate_location_exceeds_capacity(self):
        """Test validation when shelf_number exceeds rack capacity."""
        with self.assertRaises(ValueError) as context:
            ValidationService.validate_location(self.rack, 51)
        self.assertIn('exceeds rack capacity', str(context.exception))
    
    def test_validate_location_zero(self):
        """Test validation when shelf_number is zero."""
        with self.assertRaises(ValueError) as context:
            ValidationService.validate_location(self.rack, 0)
        self.assertIn('must be at least 1', str(context.exception))
    
    def test_validate_location_negative(self):
        """Test validation when shelf_number is negative."""
        with self.assertRaises(ValueError) as context:
            ValidationService.validate_location(self.rack, -1)
        self.assertIn('must be at least 1', str(context.exception))
    
    def test_validate_location_non_integer(self):
        """Test validation when shelf_number is not an integer."""
        with self.assertRaises(ValueError) as context:
            ValidationService.validate_location(self.rack, 'abc')
        self.assertIn('must be a valid integer', str(context.exception))
    
    def test_validate_location_string_number(self):
        """Test validation when shelf_number is a string number."""
        rack, shelf = ValidationService.validate_location(self.rack, '5')
        self.assertEqual(rack, self.rack)
        self.assertEqual(shelf, 5)
    
    def test_validate_location_float(self):
        """Test validation when shelf_number is a float."""
        with self.assertRaises(ValueError) as context:
            ValidationService.validate_location(self.rack, 5.5)
        self.assertIn('must be a valid integer', str(context.exception))
    
    def test_validate_location_first_slot(self):
        """Test validation with first slot (1)."""
        rack, shelf = ValidationService.validate_location(self.rack, 1)
        self.assertEqual(rack, self.rack)
        self.assertEqual(shelf, 1)
    
    def test_validate_location_middle_slot(self):
        """Test validation with middle slot (25 for 5x10 rack)."""
        rack, shelf = ValidationService.validate_location(self.rack, 25)
        self.assertEqual(rack, self.rack)
        self.assertEqual(shelf, 25)
    
    def test_validate_location_error_message_includes_capacity(self):
        """Test that error message includes rack capacity details."""
        with self.assertRaises(ValueError) as context:
            ValidationService.validate_location(self.rack, 100)
        error_msg = str(context.exception)
        self.assertIn('5 rows', error_msg)
        self.assertIn('10 columns', error_msg)
        self.assertIn('50 slots', error_msg)


class TestLocationValidationWithDifferentRacks(TestCase):
    """Test location validation with different rack configurations."""
    
    def test_small_rack(self):
        """Test validation with small rack (1x1)."""
        rack = Rack.objects.create(name='Small', row_count=1, column_count=1)
        rack, shelf = ValidationService.validate_location(rack, 1)
        self.assertEqual(shelf, 1)
        
        with self.assertRaises(ValueError):
            ValidationService.validate_location(rack, 2)
    
    def test_large_rack(self):
        """Test validation with large rack (100x100)."""
        rack = Rack.objects.create(name='Large', row_count=100, column_count=100)
        rack, shelf = ValidationService.validate_location(rack, 5000)
        self.assertEqual(shelf, 5000)
        
        rack, shelf = ValidationService.validate_location(rack, 10000)
        self.assertEqual(shelf, 10000)
        
        with self.assertRaises(ValueError):
            ValidationService.validate_location(rack, 10001)
    
    def test_asymmetric_rack(self):
        """Test validation with asymmetric rack (2x20)."""
        rack = Rack.objects.create(name='Asymmetric', row_count=2, column_count=20)
        rack, shelf = ValidationService.validate_location(rack, 40)
        self.assertEqual(shelf, 40)
        
        with self.assertRaises(ValueError):
            ValidationService.validate_location(rack, 41)
