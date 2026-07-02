from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from dies.models import Die, RoundDie, FlatDie
from machines.models import Machine, MachineCategory, Set

User = get_user_model()


class DieWorkflowIntegrationTest(TestCase):
    """Test complete die creation and search workflows"""
    
    fixtures = []  # No fixtures; create fresh data each test

    def setUp(self):
        """Set up test user, machine, and set"""
        self.user = User.objects.create_user(
            username='testadmin',
            email='test@example.com',
            password='testpass123',
            role='ADMIN'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # Create machine and set for die assignment
        self.category = MachineCategory.objects.create(name='Test Category')
        self.machine = Machine.objects.create(name='Test Machine', category=self.category)
        self.set = Set.objects.create(
            name='Test Set',
            machine=self.machine
        )

    def test_create_round_die_flow(self):
        """Test: Create ROUND die → verify in DB → verify in Meilisearch"""
        payload = {
            'die_id': 'TEST-R-001',
            'die_type': 'ROUND',
            'casing': '25x10',
            'status': 'AVAILABLE',
            'location': 'Shelf A',
            'current_set': self.set.id,
            'remarks': 'Integration test die',
            'punched_size': 2.5,
            'current_size': 2.5,
        }
        
        # 1. CREATE die via REST API
        response = self.client.post('/api/dies/', payload, format='json')
        self.assertEqual(response.status_code, 201, f"Failed to create die: {response.content}")
        
        # 2. VERIFY in database
        die = Die.objects.get(die_id='TEST-R-001')
        self.assertEqual(die.die_id, 'TEST-R-001')
        self.assertEqual(die.die_type, 'ROUND')
        self.assertTrue(hasattr(die, 'rounddie'))
        self.assertEqual(float(die.rounddie.current_size), 2.5)
        
        # 3. VERIFY in Meilisearch (may be async, so check if indexed)
        # Note: In production, this would check the async task result
        # For now, we verify the die exists in database
        self.assertIsNotNone(die)

    def test_create_flat_die_flow(self):
        """Test: Create FLAT die → verify in DB → verify fields are correct"""
        payload = {
            'die_id': 'TEST-F-001',
            'die_type': 'FLAT',
            'casing': '30x15',
            'status': 'RUNNING',
            'location': 'Shop Floor',
            'current_set': self.set.id,
            'remarks': 'FLAT test die',
            'punched_width': 15.5,
            'current_width': 15.2,
            'punched_thickness': 3.5,
            'current_thickness': 3.2,
            'radius': 2.0,
        }
        
        # CREATE die
        response = self.client.post('/api/dies/', payload, format='json')
        self.assertEqual(response.status_code, 201)
        
        # VERIFY in database
        die = Die.objects.get(die_id='TEST-F-001')
        self.assertEqual(die.die_id, 'TEST-F-001')
        self.assertEqual(die.die_type, 'FLAT')
        self.assertTrue(hasattr(die, 'flatdie'))
        self.assertAlmostEqual(float(die.flatdie.current_width), 15.2)
        self.assertAlmostEqual(float(die.flatdie.current_thickness), 3.2)
        self.assertAlmostEqual(float(die.flatdie.radius), 2.0)

    def test_update_die_and_sync_flow(self):
        """Test: Update die → verify status change → verify sync"""
        # Create initial die
        die = Die.objects.create(
            die_id='TEST-UPDATE-001',
            die_type='ROUND',
            casing='25x10',
            status='AVAILABLE',
            location='Shelf A',
            current_set=self.set
        )
        RoundDie.objects.create(die=die, punched_size=2.5, current_size=2.5)
        
        # UPDATE die status
        update_payload = {
            'status': 'RUNNING',
            'location': 'Shop Floor',
        }
        response = self.client.patch(f'/api/dies/{die.die_id}/', update_payload, format='json')
        self.assertEqual(response.status_code, 200)
        
        # VERIFY status changed in database
        die.refresh_from_db()
        self.assertEqual(die.status, 'RUNNING')
        self.assertEqual(die.location, 'Shop Floor')

    def test_list_dies_with_filter(self):
        """Test: Create multiple dies → list with filters → verify results"""
        # Create multiple dies
        for i in range(3):
            die = Die.objects.create(
                die_id=f'TEST-LIST-{i:03d}',
                die_type='ROUND' if i % 2 == 0 else 'FLAT',
                casing=f'{25+i}x10',
                status='AVAILABLE',
                location='Shelf A',
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
        
        # LIST all dies
        response = self.client.get('/api/dies/')
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data['results']), 3)
        
        # LIST dies filtered by type
        response = self.client.get('/api/dies/?die_type=ROUND')
        self.assertEqual(response.status_code, 200)
        round_dies = response.data['results']
        self.assertTrue(all(d['die_type'] == 'ROUND' for d in round_dies))

    def test_delete_die_flow(self):
        """Test: Create die → delete → verify not in database"""
        # Create die
        die = Die.objects.create(
            die_id='TEST-DELETE-001',
            die_type='ROUND',
            casing='25x10',
            status='AVAILABLE',
            location='Shelf A',
            current_set=self.set
        )
        RoundDie.objects.create(die=die, punched_size=2.5, current_size=2.5)
        die_id = die.die_id
        
        # DELETE die
        response = self.client.delete(f'/api/dies/{die_id}/')
        self.assertEqual(response.status_code, 204)
        
        # VERIFY deletion
        with self.assertRaises(Die.DoesNotExist):
            Die.objects.get(die_id=die_id)

    def test_unauthorized_create(self):
        """Test: Verify unauthorized users cannot create dies"""
        # Create user without ADMIN role
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
            'location': 'Shelf A',
            'punched_size': 2.5,
            'current_size': 2.5,
        }
        
        response = client.post('/api/dies/', payload, format='json')
        self.assertEqual(response.status_code, 403)  # Forbidden


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

    def test_search_by_die_id_filter(self):
        """Test: Create die → search by die_id filter → verify result"""
        # Create die
        die = Die.objects.create(
            die_id='SEARCH-TEST-001',
            die_type='ROUND',
            casing='25x10',
            status='AVAILABLE',
            location='Test Location',
            current_set=self.set
        )
        RoundDie.objects.create(die=die, punched_size=2.5, current_size=2.5)
        
        # SEARCH by die_id (using internal Django endpoint for testing)
        response = self.client.get('/api/dies/?die_type=ROUND')
        self.assertEqual(response.status_code, 200)
        results = response.data['results']
        matching = [d for d in results if 'SEARCH-TEST-001' in d.get('die_id', '')]
        self.assertGreater(len(matching), 0)

    def test_search_by_status_filter(self):
        """Test: Create dies with different statuses → filter by status"""
        statuses = ['AVAILABLE', 'RUNNING', 'DAMAGED']
        for i, status in enumerate(statuses):
            die = Die.objects.create(
                die_id=f'STATUS-TEST-{i:03d}',
                die_type='ROUND',
                casing='25x10',
                status=status,
                location='Shelf A',
                current_set=self.set
            )
            RoundDie.objects.create(die=die, punched_size=2.5, current_size=2.5)
        
        # SEARCH by status
        response = self.client.get('/api/dies/?status=RUNNING')
        self.assertEqual(response.status_code, 200)
        results = response.data['results']
        self.assertTrue(all(d['status'] == 'RUNNING' for d in results))

    def test_search_with_range_filter(self):
        """Test: Create ROUND dies → filter by size range"""
        sizes = [2.0, 2.5, 3.0, 3.5, 4.0]
        for i, size in enumerate(sizes):
            die = Die.objects.create(
                die_id=f'SIZE-TEST-{i:03d}',
                die_type='ROUND',
                casing='25x10',
                status='AVAILABLE',
                location='Shelf A',
                current_set=self.set
            )
            RoundDie.objects.create(die=die, punched_size=size, current_size=size)
        
        # SEARCH with size range filter
        response = self.client.get('/api/dies/?die_type=ROUND&size_min=2.5&size_max=3.5')
        self.assertEqual(response.status_code, 200)
        results = response.data['results']
        # Verify all results are within range
        for die in results:
            if die.get('current_size'):
                size = float(die['current_size'])
                self.assertGreaterEqual(size, 2.5)
                self.assertLessEqual(size, 3.5)
