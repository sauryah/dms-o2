from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from machines.models import MachineCategory, Machine, Set, Rack
from dies.models import RoundDie

User = get_user_model()

class MachinesAPITests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            username='admin', email='admin@dms.com', password='password123', role='ADMIN'
        )
        self.regular_user = User.objects.create_user(
            username='user', email='user@dms.com', password='password123', role='REGULAR'
        )
        self.category = MachineCategory.objects.create(name='Stamping')
        self.machine = Machine.objects.create(category=self.category, name='Press #1')
        self.set_obj = Set.objects.create(machine=self.machine, name='Set A', order=0)
        self.rack = Rack.objects.create(name='Rack A', row_count=5, column_count=5)

    # --- Category ViewSet Tests ---
    def test_list_categories_authenticated(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/v1/categories/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_category_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post('/api/v1/categories/', {'name': 'Bending'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(MachineCategory.objects.filter(name='Bending').exists())

    def test_create_category_regular_user_forbidden(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post('/api/v1/categories/', {'name': 'Bending'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_category_protected_error(self):
        self.client.force_authenticate(user=self.admin_user)
        # Attempt to delete category that has an active machine
        response = self.client.delete(f'/api/v1/categories/{self.category.id}/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('active machines', response.data['detail'])

    # --- Machine ViewSet Tests ---
    def test_list_machines(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/v1/machines/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['name'], 'Press #1')
        self.assertEqual(response.data[0]['category_name'], 'Stamping')

    def test_create_machine_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post('/api/v1/machines/', {
            'category': self.category.id,
            'name': 'Press #2'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_delete_machine_protected_error(self):
        self.client.force_authenticate(user=self.admin_user)
        # Attempt to delete machine that has an active set
        response = self.client.delete(f'/api/v1/machines/{self.machine.id}/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('active die sets', response.data['detail'])

    # --- Set ViewSet Tests ---
    def test_list_sets(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/v1/sets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['name'], 'Set A')
        self.assertEqual(response.data[0]['machine_name'], 'Press #1')

    def test_reorder_sets(self):
        self.client.force_authenticate(user=self.admin_user)
        machine2 = Machine.objects.create(category=self.category, name='Press #2')
        response = self.client.post('/api/v1/sets/reorder/', {
            'machine_id': machine2.id,
            'ordered_set_ids': [self.set_obj.id]
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.set_obj.refresh_from_db()
        self.assertEqual(self.set_obj.machine_id, machine2.id)

    # --- Rack ViewSet Tests ---
    def test_list_racks(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/v1/racks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_rack_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post('/api/v1/racks/', {
            'name': 'Rack B',
            'row_count': 10,
            'column_count': 10
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_delete_rack_with_assigned_dies(self):
        self.client.force_authenticate(user=self.admin_user)
        # Assign a die to the rack
        RoundDie.objects.create(
            die_id='DIE-R100',
            die_type='ROUND',
            status='AVAILABLE',
            rack=self.rack,
            rack_row=1,
            rack_column=1,
            initial_size=2.5,
            current_size=2.5
        )
        response = self.client.delete(f'/api/v1/racks/{self.rack.id}/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('active dies assigned', response.data['detail'])
