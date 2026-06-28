from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import AccessToken
from users.models import User, UserSession
import hashlib
from dies.models import Die, RoundDie, FlatDie
from history.models import DieHistory
from decimal import Decimal

class DieAPITests(APITestCase):
    def setUp(self):
        # Create users
        self.root_user = User.objects.create_superuser(
            username='rootuser',
            password='password123',
            email='root@dms.local',
            role='ROOT'
        )
        self.root_token = str(AccessToken.for_user(self.root_user))
        
        token_hash = hashlib.sha256(self.root_token.encode('utf-8')).hexdigest()
        UserSession.objects.create(
            user=self.root_user,
            token_hash=token_hash
        )

        # Create some dies
        self.round_die = Die.objects.create(
            die_id="R-101",
            die_type="ROUND",
            casing="25x10",
            status="AVAILABLE",
            location="Rack A",
        )
        self.rd_details = RoundDie.objects.create(
            die=self.round_die,
            original_size=Decimal("2.400"),
            current_size=Decimal("2.400")
        )

        self.flat_die = Die.objects.create(
            die_id="F-201",
            die_type="FLAT",
            casing="30x15",
            status="RUNNING",
            location="Rack B",
        )
        self.fd_details = FlatDie.objects.create(
            die=self.flat_die,
            original_width=Decimal("5.500"),
            current_width=Decimal("5.500"),
            original_thickness=Decimal("15.000"),
            current_thickness=Decimal("15.000"),
            radius=Decimal("1.000")
        )

    def test_list_dies(self):
        url = reverse('die-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        first_item = response.data['results'][0]
        self.assertIn('die_id', first_item)
        self.assertIn('die_type', first_item)
        self.assertIn('casing', first_item)
        self.assertIn('status', first_item)
        self.assertIn('location', first_item)
        self.assertIn('set_name', first_item)
        self.assertIn('machine_name', first_item)

    def test_filter_by_status(self):
        url = reverse('die-list') + '?status=AVAILABLE'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['die_id'], 'R-101')

    def test_filter_by_size_range(self):
        url = reverse('die-list') + '?size_min=2.3&size_max=2.5'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['die_id'], 'R-101')

    def test_filter_by_width_range(self):
        url = reverse('die-list') + '?width_min=5.0&width_max=6.0'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['die_id'], 'F-201')

    def test_get_detail_with_history(self):
        DieHistory.objects.create(
            die=self.round_die,
            field_name="status",
            old_value="AVAILABLE",
            new_value="POLISHING"
        )
        url = reverse('die-detail', kwargs={'die_id': 'R-101'})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['die_id'], 'R-101')
        self.assertEqual(len(response.data['history']), 1)
        self.assertEqual(response.data['history'][0]['field_name'], 'status')

    def test_post_without_auth(self):
        url = reverse('die-list')
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_post_with_root_auth(self):
        url = reverse('die-list')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.root_token}')
        data = {
            'die_id': 'R-301',
            'die_type': 'ROUND',
            'casing': '30x30',
            'status': 'AVAILABLE',
            'location': 'Rack C',
            'original_size': 3.5,
            'current_size': 3.5
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Die.objects.filter(die_id='R-301').exists())

    def test_patch_status_with_root_auth_creates_history(self):
        url = reverse('die-detail', kwargs={'die_id': 'R-101'})
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.root_token}')
        data = {'status': 'DAMAGED'}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(DieHistory.objects.filter(die=self.round_die, field_name='status', new_value='DAMAGED').exists())

    def test_delete_with_root_auth(self):
        url = reverse('die-detail', kwargs={'die_id': 'R-101'})
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.root_token}')
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Die.objects.filter(die_id='R-101').exists())

    def test_operator_rbac_boundaries(self):
        # Create an operator user and get token
        operator_user = User.objects.create_user(
            username='operatoruser',
            password='password123',
            email='operator@dms.local',
            role='OPERATOR'
        )
        operator_token = str(AccessToken.for_user(operator_user))
        UserSession.objects.create(
            user=operator_user,
            token_hash=hashlib.sha256(operator_token.encode('utf-8')).hexdigest()
        )
        
        # 1. Operator can view
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {operator_token}')
        url_detail = reverse('die-detail', kwargs={'die_id': 'R-101'})
        response = self.client.get(url_detail)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 2. Operator can relocate (PATCH location only)
        data = {'location': 'Rack Z'}
        response = self.client.patch(url_detail, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.round_die.refresh_from_db()
        self.assertEqual(self.round_die.location, 'Rack Z')
        
        # 3. Operator cannot PATCH other fields (e.g. status)
        data = {'status': 'DAMAGED'}
        response = self.client.patch(url_detail, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 4. Operator cannot POST (create) a die
        url_list = reverse('die-list')
        data = {
            'die_id': 'R-302',
            'die_type': 'ROUND',
            'casing': '30x30',
            'status': 'AVAILABLE',
            'location': 'Rack C',
            'original_size': 3.5,
            'current_size': 3.5
        }
        response = self.client.post(url_list, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 5. Operator cannot DELETE a die
        response = self.client.delete(url_detail)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_regular_user_cannot_relocate(self):
        # Create regular user and get token
        regular_user = User.objects.create_user(
            username='regularuser',
            password='password123',
            email='regular@dms.local',
            role='REGULAR'
        )
        regular_token = str(AccessToken.for_user(regular_user))
        UserSession.objects.create(
            user=regular_user,
            token_hash=hashlib.sha256(regular_token.encode('utf-8')).hexdigest()
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {regular_token}')
        url_detail = reverse('die-detail', kwargs={'die_id': 'R-101'})
        data = {'location': 'Rack Z'}
        response = self.client.patch(url_detail, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
