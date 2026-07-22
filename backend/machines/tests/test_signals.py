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

    def test_reorder_sets_logs_history(self):
        from rest_framework.test import APIRequestFactory, force_authenticate
        from machines.views.set import SetViewSet
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        admin_user = User.objects.create_superuser(username='admin', email='admin@dms.com', password='password')
        
        # Create a second machine
        machine2 = Machine.objects.create(category=self.category, name="Machine 2")
        
        # We want to reorder self.set_obj and assign it to machine2
        factory = APIRequestFactory()
        view = SetViewSet.as_view({'post': 'reorder'})
        
        request = factory.post('/api/sets/reorder/', {
            'machine_id': machine2.id,
            'ordered_set_ids': [self.set_obj.id]
        }, format='json')
        force_authenticate(request, user=admin_user)
        
        response = view(request)
        self.assertEqual(response.status_code, 200)
        
        # Check that the Set's machine was updated in the database
        self.set_obj.refresh_from_db()
        self.assertEqual(self.set_obj.machine_id, machine2.id)
        self.assertEqual(self.set_obj.order, 0)
        
        # Check that MachineHistory logs the set update
        history = MachineHistory.objects.filter(
            entity_type='SET',
            action='UPDATED',
            field_name='machine'
        ).first()
        self.assertIsNotNone(history)
        self.assertEqual(history.old_value, "Test Machine")
        self.assertEqual(history.new_value, "Machine 2")

