from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import AccessToken
from users.models import User, UserSession
import hashlib
from dies.models import Die, RoundDie, FlatDie
from machines.models import Rack
from history.models import DieHistory
from decimal import Decimal

class DieAPITests(APITestCase):
    def setUp(self):
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

        self.rack_a = Rack.objects.create(name="Rack A", row_count=4, column_count=3)
        self.rack_b = Rack.objects.create(name="Rack B", row_count=4, column_count=3)
        self.rack_c = Rack.objects.create(name="Rack C", row_count=4, column_count=3)

        self.round_die = Die.objects.create(
            die_id="R-101",
            die_type="ROUND",
            casing="25x10",
            status="AVAILABLE",
            rack=self.rack_a,
            shelf_number=1,
        )
        self.rd_details = RoundDie.objects.create(
            die=self.round_die,
            punched_size=Decimal("2.400"),
            current_size=Decimal("2.400")
        )

        self.flat_die = Die.objects.create(
            die_id="F-201",
            die_type="FLAT",
            casing="30x15",
            status="RUNNING",
            rack=self.rack_b,
            shelf_number=2,
        )
        self.fd_details = FlatDie.objects.create(
            die=self.flat_die,
            punched_width=Decimal("5.500"),
            current_width=Decimal("5.500"),
            punched_thickness=Decimal("15.000"),
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
        self.assertIn('rack', first_item)
        self.assertIn('shelf_number', first_item)
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
            'rack': self.rack_c.id,
            'shelf_number': 1,
            'punched_size': 3.5,
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

        # 2. Operator can relocate (PATCH rack/shelf only)
        rack_z = Rack.objects.create(name="Rack Z", row_count=4, column_count=3)
        data = {'rack': rack_z.id, 'shelf_number': 5}
        response = self.client.patch(url_detail, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.round_die.refresh_from_db()
        self.assertEqual(self.round_die.rack, rack_z)
        self.assertEqual(self.round_die.shelf_number, 5)

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
            'rack': self.rack_c.id,
            'shelf_number': 1,
            'punched_size': 3.5,
            'current_size': 3.5
        }
        response = self.client.post(url_list, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 5. Operator cannot DELETE a die
        response = self.client.delete(url_detail)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 6. Operator cannot access wear prediction
        url_wp = reverse('die-wear-prediction', kwargs={'die_id': 'R-101'})
        response = self.client.get(url_wp)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_regular_user_cannot_relocate(self):
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
        rack_z = Rack.objects.create(name="Rack Z 2", row_count=4, column_count=3)
        data = {'rack': rack_z.id, 'shelf_number': 5}
        response = self.client.patch(url_detail, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Regular user cannot access wear prediction
        url_wp = reverse('die-wear-prediction', kwargs={'die_id': 'R-101'})
        response = self.client.get(url_wp)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_detail_actions_with_slashed_die_id(self):
        slashed_die = Die.objects.create(
            die_id="IWD-AL-1/1-01",
            die_type="ROUND",
            casing="25x10",
            status="AVAILABLE",
            rack=self.rack_a,
            shelf_number=1,
        )
        RoundDie.objects.create(
            die=slashed_die,
            punched_size=Decimal("1.600"),
            current_size=Decimal("1.600")
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.root_token}')

        # Test wear prediction detail action
        url_wp = reverse('die-wear-prediction', kwargs={'die_id': 'IWD-AL-1/1-01'})
        response = self.client.get(url_wp)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['die_id'], 'IWD-AL-1/1-01')

        # Test maintenance logs detail action
        url_ml = reverse('die-maintenance-logs', kwargs={'die_id': 'IWD-AL-1/1-01'})
        response = self.client.get(url_ml)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


from dies.models import DieTolerance, WearAlert

class TolerancesAndAlertsAPITests(APITestCase):
    def setUp(self):
        self.root_user = User.objects.create_superuser(
            username='rootuser_api',
            password='password123',
            email='root_api@dms.local',
            role='ROOT'
        )
        self.root_token = str(AccessToken.for_user(self.root_user))
        UserSession.objects.create(
            user=self.root_user,
            token_hash=hashlib.sha256(self.root_token.encode('utf-8')).hexdigest()
        )

        self.rack_a = Rack.objects.create(name="Rack A TA", row_count=4, column_count=3)

        self.round_die = Die.objects.create(
            die_id="R-TEST-ALERT",
            die_type="ROUND",
            casing="25x10",
            status="AVAILABLE",
            rack=self.rack_a,
            shelf_number=1,
        )
        self.rd_details = RoundDie.objects.create(
            die=self.round_die,
            punched_size=Decimal("10.000"),
            current_size=Decimal("10.000")
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.root_token}')

    def test_list_tolerances(self):
        url = reverse('tolerance-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data['results']) >= 0)

    def test_create_and_update_tolerance(self):
        tol, created = DieTolerance.objects.get_or_create(
            die_type='ROUND',
            defaults={'max_wear_mm': Decimal('0.050'), 'warning_percentage': 70, 'critical_percentage': 90}
        )

        url_detail = reverse('tolerance-detail', kwargs={'pk': tol.pk})
        data = {
            'die_type': 'ROUND',
            'max_wear_mm': '0.075',
            'warning_percentage': 60,
            'critical_percentage': 85
        }
        response = self.client.put(url_detail, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['max_wear_mm'], '0.075')
        self.assertEqual(response.data['warning_percentage'], 60)

    def test_wear_alert_api(self):
        self.rd_details.current_size = Decimal('10.040')
        self.rd_details.save()

        url = reverse('wear-alert-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['alert_level'], 'WARNING')

    def test_operator_cannot_update_tolerance(self):
        operator_user = User.objects.create_user(
            username='operator_user',
            password='password123',
            email='operator@dms.local',
            role='OPERATOR'
        )
        operator_token = str(AccessToken.for_user(operator_user))
        UserSession.objects.create(
            user=operator_user,
            token_hash=hashlib.sha256(operator_token.encode('utf-8')).hexdigest()
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {operator_token}')

        tol, _ = DieTolerance.objects.get_or_create(
            die_type='ROUND',
            defaults={'max_wear_mm': Decimal('0.050'), 'warning_percentage': 70, 'critical_percentage': 90}
        )
        url_detail = reverse('tolerance-detail', kwargs={'pk': tol.pk})
        data = {
            'die_type': 'ROUND',
            'max_wear_mm': '0.075',
            'warning_percentage': 60,
            'critical_percentage': 85
        }

        response_get = self.client.get(url_detail)
        self.assertEqual(response_get.status_code, status.HTTP_200_OK)

        response_put = self.client.put(url_detail, data)
        self.assertEqual(response_put.status_code, status.HTTP_403_FORBIDDEN)

    def test_operator_cannot_view_wear_alerts(self):
        operator_user = User.objects.create_user(
            username='operator_user_alerts',
            password='password123',
            email='operator_alerts@dms.local',
            role='OPERATOR'
        )
        operator_token = str(AccessToken.for_user(operator_user))
        UserSession.objects.create(
            user=operator_user,
            token_hash=hashlib.sha256(operator_token.encode('utf-8')).hexdigest()
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {operator_token}')

        url = reverse('wear-alert-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_wear_prediction_caching_and_invalidation(self):
        from django.core.cache import cache
        cache_key = f"die_wear_prediction_{self.round_die.id}"
        cache.delete(cache_key)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.root_token}')
        url_wp = reverse('die-wear-prediction', kwargs={'die_id': 'R-TEST-ALERT'})

        # 1. First request computes and populates cache
        res = self.client.get(url_wp)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        cached_data = cache.get(cache_key)
        self.assertIsNotNone(cached_data)
        self.assertEqual(cached_data['die_id'], 'R-TEST-ALERT')

        # 2. Modify cache value to mock cache usage
        cached_data['overall_wear_percentage'] = 999.9
        cache.set(cache_key, cached_data, timeout=300)

        # Request should return cached modified value
        res = self.client.get(url_wp)
        self.assertEqual(res.data['overall_wear_percentage'], 999.9)

        # 3. Save the RoundDie to trigger signal which invalidates cache
        self.rd_details.current_size = Decimal('10.050')
        self.rd_details.save()

        # Cache should be cleared/invalidated
        self.assertIsNone(cache.get(cache_key))

        # Request should recompute and return original/fresh data (not 999.9)
        res = self.client.get(url_wp)
        self.assertNotEqual(res.data['overall_wear_percentage'], 999.9)
