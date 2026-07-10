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

    def test_machine_history_regular_user_only_sees_own(self):
        # Login as regular user
        res_login = self.client.post(self.login_url, {
            'username': 'regular_hist',
            'password': 'regular_password_123'
        })
        token = res_login.data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        res = self.client.get(self.machine_history_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should only return hist1 because it was changed_by regular_user
        self.assertEqual(len(res.data['results']), 1)
        self.assertEqual(res.data['results'][0]['entity_name'], 'Press-01')

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
