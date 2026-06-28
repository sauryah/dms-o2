from django.test import TestCase
from machines.models import MachineCategory, Machine, Set
from history.models import MachineHistory

class MachineHistorySignalsTests(TestCase):
    def setUp(self):
        # Category, Machine, and Set created here will trigger CREATED signals
        self.category = MachineCategory.objects.create(name="Test Category")
        self.machine = Machine.objects.create(category=self.category, name="Test Machine")
        self.set_obj = Set.objects.create(machine=self.machine, name="Test Set")

    def test_creation_logs_history(self):
        # Verify that setup creations correctly wrote history
        self.assertTrue(MachineHistory.objects.filter(
            entity_type='CATEGORY',
            action='CREATED',
            entity_name="Test Category"
        ).exists())
        self.assertTrue(MachineHistory.objects.filter(
            entity_type='MACHINE',
            action='CREATED',
            entity_name="Test Machine"
        ).exists())
        self.assertTrue(MachineHistory.objects.filter(
            entity_type='SET',
            action='CREATED',
            entity_name="Test Set"
        ).exists())

    def test_rename_machine_logs_history(self):
        self.machine.name = "Renamed Machine"
        self.machine.save()
        
        # Verify UPDATED record in MachineHistory
        history = MachineHistory.objects.filter(
            entity_type='MACHINE',
            action='UPDATED',
            field_name='name'
        ).first()
        self.assertIsNotNone(history)
        self.assertEqual(history.old_value, "Test Machine")
        self.assertEqual(history.new_value, "Renamed Machine")

    def test_delete_set_logs_history(self):
        set_id = self.set_obj.id
        set_name = self.set_obj.name
        self.set_obj.delete()
        
        # Verify DELETED record in MachineHistory
        self.assertTrue(MachineHistory.objects.filter(
            entity_type='SET',
            action='DELETED',
            entity_id=set_id,
            entity_name=set_name
        ).exists())
