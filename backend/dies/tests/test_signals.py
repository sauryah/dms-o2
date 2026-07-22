from django.test import TestCase
from dies.models import Die, RoundDie, FlatDie
from machines.models import MachineCategory, Machine, Set, Rack
from history.models import DieHistory
from decimal import Decimal

class DieSignalTests(TestCase):
    def setUp(self):
        self.category = MachineCategory.objects.create(name="Cat 1")
        self.machine = Machine.objects.create(category=self.category, name="Machine 1")
        self.set_a = Set.objects.create(machine=self.machine, name="Set A")
        self.set_b = Set.objects.create(machine=self.machine, name="Set B")
        self.rack_a = Rack.objects.create(name="Rack A", row_count=4, column_count=3)
        self.rack_b = Rack.objects.create(name="Rack B", row_count=4, column_count=3)

    def test_create_new_die_no_history(self):
        die = Die.objects.create(
            die_id="ROUND-NEW",
            die_type="ROUND",
            casing="25x10",
            status="AVAILABLE",
            rack=self.rack_a,
            shelf_number=1,
        )
        history_count = DieHistory.objects.filter(die=die).count()
        self.assertEqual(history_count, 0)

    def test_change_die_status_creates_history(self):
        die = Die.objects.create(
            die_id="ROUND-STATUS",
            die_type="ROUND",
            casing="25x10",
            status="AVAILABLE",
        )
        die.status = "RUNNING"
        die.save()

        history = DieHistory.objects.filter(die=die, field_name="status").first()
        self.assertIsNotNone(history)
        self.assertEqual(history.old_value, "AVAILABLE")
        self.assertEqual(history.new_value, "RUNNING")

    def test_change_die_current_set_creates_history(self):
        die = Die.objects.create(
            die_id="ROUND-SET",
            die_type="ROUND",
            casing="25x10",
            status="AVAILABLE",
            current_set=self.set_a,
        )
        die.current_set = self.set_b
        die.save()

        history = DieHistory.objects.filter(die=die, field_name="current_set_id").first()
        self.assertIsNotNone(history)
        self.assertEqual(history.old_value, self.set_a.name)
        self.assertEqual(history.new_value, self.set_b.name)

    def test_change_die_rack_creates_history(self):
        die = Die.objects.create(
            die_id="ROUND-LOC",
            die_type="ROUND",
            casing="25x10",
            status="AVAILABLE",
            rack=self.rack_a,
            shelf_number=1,
        )
        die.rack = self.rack_b
        die.save()

        history = DieHistory.objects.filter(die=die, field_name="rack_id").first()
        self.assertIsNotNone(history)
        self.assertEqual(history.old_value, str(self.rack_a.pk))
        self.assertEqual(history.new_value, str(self.rack_b.pk))

    def test_change_round_die_size_creates_history(self):
        die = Die.objects.create(
            die_id="ROUND-SIZE",
            die_type="ROUND",
            casing="25x10",
            status="AVAILABLE",
        )
        round_die = RoundDie.objects.create(
            die=die,
            punched_size=Decimal("10.000"),
            current_size=Decimal("10.000"),
        )
        self.assertEqual(DieHistory.objects.filter(die=die).count(), 0)

        round_die.current_size = Decimal("9.950")
        round_die.save()

        history = DieHistory.objects.filter(die=die, field_name="current_size").first()
        self.assertIsNotNone(history)
        self.assertEqual(history.old_value, "10.000")
        self.assertEqual(history.new_value, "9.950")

    def test_change_flat_die_width_creates_history(self):
        die = Die.objects.create(
            die_id="FLAT-WIDTH",
            die_type="FLAT",
            casing="30x15",
            status="AVAILABLE",
        )
        flat_die = FlatDie.objects.create(
            die=die,
            punched_width=Decimal("30.000"),
            current_width=Decimal("30.000"),
            punched_thickness=Decimal("15.000"),
            current_thickness=Decimal("15.000"),
            radius=Decimal("1.000"),
        )

        flat_die.current_width = Decimal("29.900")
        flat_die.save()

        history = DieHistory.objects.filter(die=die, field_name="current_width").first()
        self.assertIsNotNone(history)
        self.assertEqual(history.old_value, "30.000")
        self.assertEqual(history.new_value, "29.900")

    def test_change_flat_die_thickness_creates_history(self):
        die = Die.objects.create(
            die_id="FLAT-THICK",
            die_type="FLAT",
            casing="30x15",
            status="AVAILABLE",
        )
        flat_die = FlatDie.objects.create(
            die=die,
            punched_width=Decimal("30.000"),
            current_width=Decimal("30.000"),
            punched_thickness=Decimal("15.000"),
            current_thickness=Decimal("15.000"),
            radius=Decimal("1.000"),
        )

        flat_die.current_thickness = Decimal("14.850")
        flat_die.save()

        history = DieHistory.objects.filter(die=die, field_name="current_thickness").first()
        self.assertIsNotNone(history)
        self.assertEqual(history.old_value, "15.000")
        self.assertEqual(history.new_value, "14.850")

    def test_no_change_no_history(self):
        die = Die.objects.create(
            die_id="ROUND-NO-CHANGE",
            die_type="ROUND",
            casing="25x10",
            status="AVAILABLE",
            rack=self.rack_a,
            shelf_number=1,
        )
        die.save()
        history_count = DieHistory.objects.filter(die=die).count()
        self.assertEqual(history_count, 0)
