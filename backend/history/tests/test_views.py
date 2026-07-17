from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from users.models import User
from history.models import MachineHistory

class MachineHistoryApiTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='admin_hist',
            password='admin_password_123',
            role='ADMIN'
        )
        self.regular_user = User.objects.create_user(
            username='regular_hist',
            password='regular_password_123',
            role='REGULAR'
        )
        self.login_url = reverse('login')
        self.machine_history_url = reverse('machine-history')
        
        # Clear rate-limiter keys in Redis and Django Cache to avoid 429 too many requests in consecutive test runs
        from django.core.cache import cache
        cache.clear()
        import redis
        from django.conf import settings
        try:
            redis_url = settings.CACHES['default']['LOCATION']
            r = redis.Redis.from_url(redis_url)
            r.delete('login_attempts:admin_hist', 'login_attempts:regular_hist')
        except Exception:
            pass
        
        # Create some MachineHistory entries
        self.hist1 = MachineHistory.objects.create(
            entity_type='MACHINE',
            entity_id=1,
            entity_name='Press-01',
            action='CREATED',
            changed_by=self.regular_user
        )
        self.hist2 = MachineHistory.objects.create(
            entity_type='SET',
            entity_id=2,
            entity_name='Set-02',
            action='UPDATED',
            field_name='status',
            old_value='INACTIVE',
            new_value='ACTIVE',
            changed_by=self.admin_user
        )

    def test_machine_history_requires_authentication(self):
        res = self.client.get(self.machine_history_url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_machine_history_regular_user_is_denied(self):
        # Login as regular user
        res_login = self.client.post(self.login_url, {
            'username': 'regular_hist',
            'password': 'regular_password_123'
        })
        token = res_login.data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        res = self.client.get(self.machine_history_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_machine_history_admin_sees_all(self):
        # Login as admin user
        res_login = self.client.post(self.login_url, {
            'username': 'admin_hist',
            'password': 'admin_password_123'
        })
        token = res_login.data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        res = self.client.get(self.machine_history_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should return both hist1 and hist2
        self.assertEqual(len(res.data['results']), 2)


from dies.models import Die
from history.models import DieHistory

class DashboardHistoryApiTests(APITestCase):
    def setUp(self):
        self.regular_user = User.objects.create_user(
            username='regular_dash_hist',
            password='regular_password_123',
            role='REGULAR'
        )
        self.login_url = reverse('login')
        self.dashboard_history_url = '/api/v1/history/dashboard/'
        
        # Clear cache to ensure test isolation
        from django.core.cache import cache
        cache.clear()
        
        self.die = Die.objects.create(die_id='R-DASH-1', die_type='ROUND', casing='casing', status='AVAILABLE')
        self.hist = DieHistory.objects.create(
            die=self.die,
            changed_by=self.regular_user,
            field_name='status',
            old_value='CLEANING',
            new_value='AVAILABLE',
            ip_address='127.0.0.1',
            note='Sensitive note'
        )

    def test_dashboard_history_allows_regular_user_and_hides_sensitive_fields(self):
        # Login as regular user
        res_login = self.client.post(self.login_url, {
            'username': 'regular_dash_hist',
            'password': 'regular_password_123'
        })
        token = res_login.data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        res = self.client.get(self.dashboard_history_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should return history list
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['die_id'], 'R-DASH-1')
        self.assertNotIn('ip_address', res.data[0])
        self.assertNotIn('note', res.data[0])
