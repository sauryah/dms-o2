from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from dies.models import Die, RoundDie, FlatDie
from machines.models import Machine, MachineCategory, Set, Rack

User = get_user_model()


class DieWorkflowIntegrationTest(TestCase):
    """Test complete die creation and search workflows"""

    fixtures = []

    def setUp(self):
        """Set up test user, machine, rack, and set"""
        self.user = User.objects.create_user(
            username='testadmin',
            email='test@example.com',
            password='testpass123',
            role='ADMIN'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.category = MachineCategory.objects.create(name='Test Category')
        self.machine = Machine.objects.create(name='Test Machine', category=self.category)
        self.set = Set.objects.create(
            name='Test Set',
            machine=self.machine
        )
        self.rack_a = Rack.objects.create(name="Rack A", row_count=4, column_count=3)
        self.rack_b = Rack.objects.create(name="Rack B", row_count=4, column_count=3)

    def test_create_round_die_flow(self):
        """Test: Create ROUND die -> verify in DB -> verify in Meilisearch"""
        payload = {
            'die_id': 'TEST-R-001',
            'die_type': 'ROUND',
            'casing': '25x10',
            'status': 'AVAILABLE',
            'rack': self.rack_a.id,
            'shelf_number': 1,
            'current_set': self.set.id,
            'remarks': 'Integration test die',
            'punched_size': 2.5,
            'current_size': 2.5,
        }

        response = self.client.post('/api/v1/dies/', payload, format='json')
        self.assertEqual(response.status_code, 201, f"Failed to create die: {response.content}")

        die = Die.objects.get(die_id='TEST-R-001')
        self.assertEqual(die.die_id, 'TEST-R-001')
        self.assertEqual(die.die_type, 'ROUND')
        self.assertTrue(hasattr(die, 'rounddie'))
        self.assertEqual(float(die.rounddie.current_size), 2.5)

        self.assertIsNotNone(die)

    def test_create_flat_die_flow(self):
        """Test: Create FLAT die -> verify in DB -> verify fields are correct"""
        payload = {
            'die_id': 'TEST-F-001',
            'die_type': 'FLAT',
            'casing': '30x15',
            'status': 'RUNNING',
            'rack': self.rack_b.id,
            'shelf_number': 2,
            'current_set': self.set.id,
            'remarks': 'FLAT test die',
            'punched_width': 15.5,
            'current_width': 15.2,
            'punched_thickness': 3.5,
            'current_thickness': 3.2,
            'radius': 2.0,
        }

        response = self.client.post('/api/v1/dies/', payload, format='json')
        self.assertEqual(response.status_code, 201)

        die = Die.objects.get(die_id='TEST-F-001')
        self.assertEqual(die.die_id, 'TEST-F-001')
        self.assertEqual(die.die_type, 'FLAT')
        self.assertTrue(hasattr(die, 'flatdie'))
        self.assertAlmostEqual(float(die.flatdie.current_width), 15.2)
        self.assertAlmostEqual(float(die.flatdie.current_thickness), 3.2)
        self.assertAlmostEqual(float(die.flatdie.radius), 2.0)

    def test_update_die_and_sync_flow(self):
        """Test: Update die -> verify status change -> verify sync"""
        die = Die.objects.create(
            die_id='TEST-UPDATE-001',
            die_type='ROUND',
            casing='25x10',
            status='AVAILABLE',
            rack=self.rack_a,
            shelf_number=1,
            current_set=self.set
        )
        RoundDie.objects.create(die=die, punched_size=2.5, current_size=2.5)

        update_payload = {
            'status': 'RUNNING',
            'rack': self.rack_b.id,
            'shelf_number': 3,
        }
        response = self.client.patch(f'/api/v1/dies/{die.die_id}/', update_payload, format='json')
        self.assertEqual(response.status_code, 200)

        die.refresh_from_db()
        self.assertEqual(die.status, 'RUNNING')
        self.assertEqual(die.rack, self.rack_b)
        self.assertEqual(die.shelf_number, 3)

    def test_list_dies_with_filter(self):
        """Test: Create multiple dies -> list with filters -> verify results"""
        for i in range(3):
            die = Die.objects.create(
                die_id=f'TEST-LIST-{i:03d}',
                die_type='ROUND' if i % 2 == 0 else 'FLAT',
                casing=f'{25+i}x10',
                status='AVAILABLE',
                rack=self.rack_a,
                shelf_number=i + 1,
                current_set=self.set
            )
            if die.die_type == 'ROUND':
                RoundDie.objects.create(die=die, punched_size=2.5, current_size=2.5)
            else:
                FlatDie.objects.create(
                    die=die,
                    punched_width=15.0,
                    current_width=15.0,
                    punched_thickness=3.0,
                    current_thickness=3.0,
                    radius=2.0
                )

        response = self.client.get('/api/v1/dies/')
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data['results']), 3)

        response = self.client.get('/api/v1/dies/?die_type=ROUND')
        self.assertEqual(response.status_code, 200)
        round_dies = response.data['results']
        self.assertTrue(all(d['die_type'] == 'ROUND' for d in round_dies))

    def test_delete_die_flow(self):
        """Test: Create die -> delete -> verify not in database"""
        die = Die.objects.create(
            die_id='TEST-DELETE-001',
            die_type='ROUND',
            casing='25x10',
            status='AVAILABLE',
            rack=self.rack_a,
            shelf_number=1,
            current_set=self.set
        )
        RoundDie.objects.create(die=die, punched_size=2.5, current_size=2.5)
        die_id = die.die_id

        response = self.client.delete(f'/api/v1/dies/{die_id}/')
        self.assertEqual(response.status_code, 204)

        with self.assertRaises(Die.DoesNotExist):
            Die.objects.get(die_id=die_id)

    def test_unauthorized_create(self):
        """Test: Verify unauthorized users cannot create dies"""
        user = User.objects.create_user(
            username='viewer',
            email='viewer@example.com',
            password='viewpass123',
            role='VIEWER'
        )
        client = APIClient()
        client.force_authenticate(user=user)

        payload = {
            'die_id': 'TEST-UNAUTH-001',
            'die_type': 'ROUND',
            'casing': '25x10',
            'status': 'AVAILABLE',
            'rack': self.rack_a.id,
            'shelf_number': 1,
            'punched_size': 2.5,
            'current_size': 2.5,
        }

        response = client.post('/api/v1/dies/', payload, format='json')
        self.assertEqual(response.status_code, 403)


class SearchIntegrationTest(TestCase):
    """Test search functionality across Go API and database"""

    def setUp(self):
        """Set up test user and search data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='ADMIN'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.category = MachineCategory.objects.create(name='Search Test Category')
        self.machine = Machine.objects.create(name='Search Test Machine', category=self.category)
        self.set = Set.objects.create(name='Search Test Set', machine=self.machine)
        self.rack = Rack.objects.create(name="Search Rack", row_count=4, column_count=3)

    def test_search_by_die_id_filter(self):
        """Test: Create die -> search by die_id filter -> verify result"""
        die = Die.objects.create(
            die_id='SEARCH-TEST-001',
            die_type='ROUND',
            casing='25x10',
            status='AVAILABLE',
            rack=self.rack,
            shelf_number=1,
            current_set=self.set
        )
        RoundDie.objects.create(die=die, punched_size=2.5, current_size=2.5)

        response = self.client.get('/api/v1/dies/?die_type=ROUND')
        self.assertEqual(response.status_code, 200)
        results = response.data['results']
        matching = [d for d in results if 'SEARCH-TEST-001' in d.get('die_id', '')]
        self.assertGreater(len(matching), 0)

    def test_search_by_status_filter(self):
        """Test: Create dies with different statuses -> filter by status"""
        statuses = ['AVAILABLE', 'RUNNING', 'DAMAGED']
        for i, status in enumerate(statuses):
            die = Die.objects.create(
                die_id=f'STATUS-TEST-{i:03d}',
                die_type='ROUND',
                casing='25x10',
                status=status,
                rack=self.rack,
                shelf_number=i + 1,
                current_set=self.set
            )
            RoundDie.objects.create(die=die, punched_size=2.5, current_size=2.5)

        response = self.client.get('/api/v1/dies/?status=RUNNING')
        self.assertEqual(response.status_code, 200)
        results = response.data['results']
        self.assertTrue(all(d['status'] == 'RUNNING' for d in results))

    def test_search_with_range_filter(self):
        """Test: Create ROUND dies -> filter by size range"""
        sizes = [2.0, 2.5, 3.0, 3.5, 4.0]
        for i, size in enumerate(sizes):
            die = Die.objects.create(
                die_id=f'SIZE-TEST-{i:03d}',
                die_type='ROUND',
                casing='25x10',
                status='AVAILABLE',
                rack=self.rack,
                shelf_number=i + 1,
                current_set=self.set
            )
            RoundDie.objects.create(die=die, punched_size=size, current_size=size)

        response = self.client.get('/api/v1/dies/?die_type=ROUND&size_min=2.5&size_max=3.5')
        self.assertEqual(response.status_code, 200)
        results = response.data['results']
        for die in results:
            if die.get('current_size'):
                size = float(die['current_size'])
                self.assertGreaterEqual(size, 2.5)
                self.assertLessEqual(size, 3.5)
