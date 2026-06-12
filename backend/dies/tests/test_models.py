from django.test import TestCase
from django.db.utils import IntegrityError
from dies.models import Die, RoundDie, FlatDie
from history.models import DieHistory
from decimal import Decimal

class DieModelTests(TestCase):
    def test_create_round_die_with_location(self):
        die = Die.objects.create(
            die_id="ROUND-001",
            die_type="ROUND",
            casing="25x10",
            status="AVAILABLE",
            location="Rack A - Shelf 3",
            remarks="Round die test"
        )
        round_die = RoundDie.objects.create(
            die=die,
            original_size=Decimal("12.345"),
            current_size=Decimal("12.345")
        )
        self.assertEqual(die.die_type, "ROUND")
        self.assertEqual(die.location, "Rack A - Shelf 3")
        self.assertEqual(round_die.die, die)
        self.assertEqual(round_die.current_size, Decimal("12.345"))

    def test_create_die_with_blank_location(self):
        die = Die.objects.create(
            die_id="ROUND-002",
            die_type="ROUND",
            casing="25x10",
            status="AVAILABLE",
            location="",  # blank location
            remarks=""
        )
        self.assertEqual(die.location, "")

    def test_create_flat_die(self):
        die = Die.objects.create(
            die_id="FLAT-001",
            die_type="FLAT",
            casing="30x15",
            status="AVAILABLE",
            location="Rack B - Shelf 1",
            remarks="Flat die test"
        )
        flat_die = FlatDie.objects.create(
            die=die,
            original_width=Decimal("30.000"),
            current_width=Decimal("29.950"),
            original_thickness=Decimal("15.000"),
            current_thickness=Decimal("14.950"),
            radius=Decimal("1.500")
        )
        self.assertEqual(die.die_type, "FLAT")
        self.assertEqual(flat_die.die, die)
        self.assertEqual(flat_die.current_width, Decimal("29.950"))
        self.assertEqual(flat_die.current_thickness, Decimal("14.950"))

    def test_die_id_unique(self):
        Die.objects.create(
            die_id="DUPE-001",
            die_type="ROUND",
            casing="10x10",
            status="AVAILABLE",
        )
        with self.assertRaises(IntegrityError):
            Die.objects.create(
                die_id="DUPE-001",
                die_type="ROUND",
                casing="20x20",
                status="AVAILABLE",
            )

    def test_die_history_fk(self):
        die = Die.objects.create(
            die_id="HIST-001",
            die_type="ROUND",
            casing="20x20",
            status="AVAILABLE",
        )
        history = DieHistory.objects.create(
            die=die,
            field_name="status",
            old_value="AVAILABLE",
            new_value="RUNNING",
        )
        self.assertEqual(history.die, die)
        self.assertEqual(history.field_name, "status")
