from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from django.core.management import call_command
from users.models import User, UserSession
import hashlib

class AuthTests(APITestCase):
    def setUp(self):
        # Create users
        self.root_user = User.objects.create_user(
            username='root_test',
            password='root_password_123',
            email='root@dms.local',
            role='ROOT'
        )
        self.admin_user = User.objects.create_user(
            username='admin_test',
            password='admin_password_123',
            email='admin@dms.local',
            role='ADMIN'
        )
        self.regular_user = User.objects.create_user(
            username='regular_test',
            password='regular_password_123',
            email='regular@dms.local',
            role='REGULAR'
        )

        # URLs
        self.login_url = reverse('login')
        self.dies_list_url = reverse('die-list')
        self.users_list_url = reverse('user-list')

    def test_login_correct_credentials(self):
        response = self.client.post(self.login_url, {
            'username': 'admin_test',
            'password': 'admin_password_123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['role'], 'ADMIN')

    def test_login_wrong_credentials(self):
        response = self.client.post(self.login_url, {
            'username': 'admin_test',
            'password': 'wrong_password'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_concurrent_sessions_invalidation(self):
        # Login on device A
        res_a = self.client.post(self.login_url, {
            'username': 'admin_test',
            'password': 'admin_password_123'
        })
        token_a = res_a.data['token']

        # Verify token A works
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_a}')
        response = self.client.get(self.dies_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Login on device B
        res_b = self.client.post(self.login_url, {
            'username': 'admin_test',
            'password': 'admin_password_123'
        })
        token_b = res_b.data['token']

        # Verify token A now returns 401
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_a}')
        response_a = self.client.get(self.dies_list_url)
        self.assertEqual(response_a.status_code, status.HTTP_401_UNAUTHORIZED)

        # Verify token B still works
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_b}')
        response_b = self.client.get(self.dies_list_url)
        self.assertEqual(response_b.status_code, status.HTTP_200_OK)

    def test_session_idle_timeout(self):
        res = self.client.post(self.login_url, {
            'username': 'admin_test',
            'password': 'admin_password_123'
        })
        token = res.data['token']

        # Artificially set last_seen to 31 minutes ago
        session = UserSession.objects.get(user=self.admin_user)
        UserSession.objects.filter(pk=session.pk).update(
            last_seen=timezone.now() - timedelta(minutes=31)
        )

        # Run prune command
        call_command('expire_sessions')

        # Verify session is deleted
        self.assertFalse(UserSession.objects.filter(user=self.admin_user).exists())

        # Verify token returns 401
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(self.dies_list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_session_absolute_timeout(self):
        res = self.client.post(self.login_url, {
            'username': 'admin_test',
            'password': 'admin_password_123'
        })
        token = res.data['token']

        # Artificially set created_at to 13 hours ago
        session = UserSession.objects.get(user=self.admin_user)
        UserSession.objects.filter(pk=session.pk).update(
            created_at=timezone.now() - timedelta(hours=13)
        )

        # Run prune command
        call_command('expire_sessions')

        # Verify session is deleted
        self.assertFalse(UserSession.objects.filter(user=self.admin_user).exists())

        # Verify token returns 401
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(self.dies_list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_endpoint_authorization_regular_public(self):
        # Unauthenticated GET /api/dies/ → 200 (public)
        self.client.credentials()
        response = self.client.get(self.dies_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Unauthenticated POST /api/dies/ → 401
        response = self.client.post(self.dies_list_url, {
            'die_id': 'R-TEST-99',
            'die_type': 'ROUND',
            'casing': '10x10',
            'status': 'AVAILABLE',
            'original_size': 1.0,
            'current_size': 1.0
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_endpoint_authorization_admin(self):
        # Authenticate as admin
        res = self.client.post(self.login_url, {
            'username': 'admin_test',
            'password': 'admin_password_123'
        })
        token = res.data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # Admin token POST /api/dies/ → 201
        response = self.client.post(self.dies_list_url, {
            'die_id': 'R-TEST-99',
            'die_type': 'ROUND',
            'casing': '10x10',
            'status': 'AVAILABLE',
            'original_size': 1.0,
            'current_size': 1.0
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Admin token POST /api/users/ → 403 (root only)
        response = self.client.post(self.users_list_url, {
            'username': 'admin_new',
            'password': 'password123',
            'role': 'ADMIN',
            'email': 'new_admin@dms.local'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_endpoint_authorization_root(self):
        # Authenticate as root
        res = self.client.post(self.login_url, {
            'username': 'root_test',
            'password': 'root_password_123'
        })
        token = res.data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # Root token POST /api/users/ → 201
        response = self.client.post(self.users_list_url, {
            'username': 'admin_new',
            'password': 'password123',
            'role': 'ADMIN',
            'email': 'new_admin@dms.local'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='admin_new').exists())
