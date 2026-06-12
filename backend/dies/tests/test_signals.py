from django.test import TestCase
from dies.models import Die, RoundDie, FlatDie
from machines.models import MachineCategory, Machine, Set
from history.models import DieHistory
from decimal import Decimal

class DieSignalTests(TestCase):
    def setUp(self):
        # Set up a Machine and Set for testing foreign key updates
        self.category = MachineCategory.objects.create(name="Cat 1")
        self.machine = Machine.objects.create(category=self.category, name="Machine 1")
        self.set_a = Set.objects.create(machine=self.machine, name="Set A")
        self.set_b = Set.objects.create(machine=self.machine, name="Set B")

    def test_create_new_die_no_history(self):
        # Create new Die -> no DieHistory row created
        die = Die.objects.create(
            die_id="ROUND-NEW",
            die_type="ROUND",
            casing="25x10",
            status="AVAILABLE",
            location="Rack A",
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
        self.assertEqual(history.old_value, str(self.set_a.id))
        self.assertEqual(history.new_value, str(self.set_b.id))

    def test_change_die_location_creates_history(self):
        die = Die.objects.create(
            die_id="ROUND-LOC",
            die_type="ROUND",
            casing="25x10",
            status="AVAILABLE",
            location="Rack A",
        )
        die.location = "Rack B"
        die.save()

        history = DieHistory.objects.filter(die=die, field_name="location").first()
        self.assertIsNotNone(history)
        self.assertEqual(history.old_value, "Rack A")
        self.assertEqual(history.new_value, "Rack B")

    def test_change_round_die_size_creates_history(self):
        die = Die.objects.create(
            die_id="ROUND-SIZE",
            die_type="ROUND",
            casing="25x10",
            status="AVAILABLE",
        )
        round_die = RoundDie.objects.create(
            die=die,
            original_size=Decimal("10.000"),
            current_size=Decimal("10.000"),
        )
        # Verify no history created on creation of round_die either
        self.assertEqual(DieHistory.objects.filter(die=die).count(), 0)

        # Now change the current_size
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
            original_width=Decimal("30.000"),
            current_width=Decimal("30.000"),
            original_thickness=Decimal("15.000"),
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
            original_width=Decimal("30.000"),
            current_width=Decimal("30.000"),
            original_thickness=Decimal("15.000"),
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
            location="Rack A",
        )
        # Update without changing anything
        die.save()
        history_count = DieHistory.objects.filter(die=die).count()
        self.assertEqual(history_count, 0)
