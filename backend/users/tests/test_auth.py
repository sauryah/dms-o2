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
            'punched_size': 1.0,
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
            'punched_size': 1.0,
            'current_size': 1.0
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Admin token POST /api/users/ → 403 (root only)
        response = self.client.post(self.users_list_url, {
            'username': 'admin_new',
            'password': 'secure_test_password_123',
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
            'password': 'secure_test_password_123',
            'role': 'ADMIN',
            'email': 'new_admin@dms.local'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='admin_new').exists())

    def test_create_and_update_user_name_fields(self):
        # Authenticate as root
        res = self.client.post(self.login_url, {
            'username': 'root_test',
            'password': 'root_password_123'
        })
        token = res.data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # Create user with first_name and last_name
        response = self.client.post(self.users_list_url, {
            'username': 'john_doe',
            'password': 'secure_test_password_123',
            'role': 'ADMIN',
            'email': 'john@dms.local',
            'first_name': 'John',
            'last_name': 'Doe'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['first_name'], 'John')
        self.assertEqual(response.data['last_name'], 'Doe')

        user = User.objects.get(username='john_doe')
        self.assertEqual(user.first_name, 'John')
        self.assertEqual(user.last_name, 'Doe')

        # Update user's first_name and last_name
        response = self.client.patch(reverse('user-detail', kwargs={'pk': user.id}), {
            'first_name': 'Johnny',
            'last_name': 'Smith'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'Johnny')
        self.assertEqual(response.data['last_name'], 'Smith')

        user.refresh_from_db()
        self.assertEqual(user.first_name, 'Johnny')
        self.assertEqual(user.last_name, 'Smith')

    def test_session_eviction_on_password_change(self):
        # Log in to create user session
        response = self.client.post(self.login_url, {
            'username': 'admin_test',
            'password': 'admin_password_123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(UserSession.objects.filter(user=self.admin_user).exists())

        # Change user password
        self.admin_user.set_password('new_password_123')
        self.admin_user.save()

        # Session should be deleted
        self.assertFalse(UserSession.objects.filter(user=self.admin_user).exists())

    def test_session_eviction_on_deactivation(self):
        # Log in to create user session
        response = self.client.post(self.login_url, {
            'username': 'admin_test',
            'password': 'admin_password_123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(UserSession.objects.filter(user=self.admin_user).exists())

        # Deactivate user
        self.admin_user.is_active = False
        self.admin_user.save()

        # Session should be deleted
        self.assertFalse(UserSession.objects.filter(user=self.admin_user).exists())

    def test_brute_force_login_lockout(self):
        import redis
        from django.conf import settings
        redis_url = settings.CACHES['default']['LOCATION']
        r = redis.Redis.from_url(redis_url)
        
        username = 'admin_test'
        attempts_key = f"login_attempts:{username}"
        r.delete(attempts_key)
        
        try:
            # First 4 attempts return 401
            for i in range(4):
                response = self.client.post(self.login_url, {
                    'username': username,
                    'password': 'wrong_password_attempt'
                })
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
                
            # 5th attempt returns 429
            response = self.client.post(self.login_url, {
                'username': username,
                'password': 'wrong_password_attempt'
            })
            self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
            self.assertIn("Too many failed login attempts", response.data['detail'])
            
            # Login with correct credentials returns 429 during lockout
            response = self.client.post(self.login_url, {
                'username': username,
                'password': 'admin_password_123'
            })
            self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
            
            # Reset/clear lockout counter simulating 5 mins pass
            r.delete(attempts_key)
            
            # Login works
            response = self.client.post(self.login_url, {
                'username': username,
                'password': 'admin_password_123'
            })
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIsNone(r.get(attempts_key))
        finally:
            r.delete(attempts_key)

    def test_sse_ticket_exchange(self):
        import uuid
        import redis
        from django.conf import settings
        
        # 1. Unauthenticated request returns 401
        ticket_url = reverse('sse-ticket')
        res_unauth = self.client.post(ticket_url)
        self.assertEqual(res_unauth.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # 2. Authenticated request returns ticket UUID
        login_res = self.client.post(self.login_url, {
            'username': 'admin_test',
            'password': 'admin_password_123'
        })
        token = login_res.data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        response = self.client.post(ticket_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('ticket', response.data)
        ticket_uuid = response.data['ticket']
        
        # Verify valid UUID format
        try:
            uuid.UUID(ticket_uuid)
        except ValueError:
            self.fail("Returned ticket is not a valid UUID")
            
        # 3. Check Redis key, user_id mapping, and TTL
        redis_url = settings.CACHES['default']['LOCATION']
        r = redis.Redis.from_url(redis_url)
        ticket_key = f"sse_ticket:{ticket_uuid}"
        
        try:
            user_id_val = r.get(ticket_key)
            self.assertIsNotNone(user_id_val)
            self.assertEqual(int(user_id_val), self.admin_user.id)
            
            ttl = r.ttl(ticket_key)
            self.assertTrue(25 <= ttl <= 30)
            
            # 4. Simulating one-time use (delete after use)
            r.delete(ticket_key)
            self.assertIsNone(r.get(ticket_key))
        finally:
            r.delete(ticket_key)

    def test_verify_token_endpoint(self):
        verify_url = reverse('verify-token')
        
        # 1. Test without token
        response = self.client.post(verify_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # 2. Login to get token
        login_res = self.client.post(self.login_url, {
            'username': 'admin_test',
            'password': 'admin_password_123'
        })
        token = login_res.data['token']
        
        # 3. Test with valid token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post(verify_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['valid'])
        self.assertEqual(response.data['user_id'], self.admin_user.id)
        self.assertEqual(response.data['role'], 'ADMIN')

    def test_multi_device_concurrent_sessions(self):
        from django.test import override_settings
        
        with override_settings(SESSION_MAX_CONCURRENT=2):
            # 1. Login on device A
            res_a = self.client.post(self.login_url, {
                'username': 'admin_test',
                'password': 'admin_password_123'
            })
            token_a = res_a.data['token']

            # 2. Login on device B
            res_b = self.client.post(self.login_url, {
                'username': 'admin_test',
                'password': 'admin_password_123'
            })
            token_b = res_b.data['token']

            # 3. Verify BOTH token A and token B work concurrently
            self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_a}')
            response_a = self.client.get(self.dies_list_url)
            self.assertEqual(response_a.status_code, status.HTTP_200_OK)

            self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_b}')
            response_b = self.client.get(self.dies_list_url)
            self.assertEqual(response_b.status_code, status.HTTP_200_OK)

            # 4. Login on device C (should evict token A because it is the oldest)
            res_c = self.client.post(self.login_url, {
                'username': 'admin_test',
                'password': 'admin_password_123'
            })
            token_c = res_c.data['token']

            # 5. Verify token A is now invalid
            self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_a}')
            response_a_evicted = self.client.get(self.dies_list_url)
            self.assertEqual(response_a_evicted.status_code, status.HTTP_401_UNAUTHORIZED)

            # 6. Verify token B and C are still valid
            self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_b}')
            response_b_still_works = self.client.get(self.dies_list_url)
            self.assertEqual(response_b_still_works.status_code, status.HTTP_200_OK)

            self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_c}')
            response_c_works = self.client.get(self.dies_list_url)
            self.assertEqual(response_c_works.status_code, status.HTTP_200_OK)


from users.models import UserActivityLog

class UserActivityLogTests(APITestCase):
    def setUp(self):
        self.root_user = User.objects.create_user(
            username='root_test_audit',
            password='root_password_123',
            role='ROOT'
        )
        self.regular_user = User.objects.create_user(
            username='regular_test_audit',
            password='regular_password_123',
            role='REGULAR'
        )
        self.login_url = reverse('login')
        self.logout_url = reverse('logout')
        self.activity_logs_url = '/api/activity-logs/'
        self.dies_list_url = reverse('die-list')

    def test_login_logout_creates_activity_logs(self):
        # 1. Login success
        res = self.client.post(self.login_url, {
            'username': 'regular_test_audit',
            'password': 'regular_password_123'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        # Verify LOGIN log was created
        log = UserActivityLog.objects.filter(username='regular_test_audit', action='LOGIN').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.user, self.regular_user)

        # 2. Logout success
        token = res.data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        res_logout = self.client.post(self.logout_url)
        self.assertEqual(res_logout.status_code, status.HTTP_200_OK)

        # Verify LOGOUT log was created
        logout_log = UserActivityLog.objects.filter(username='regular_test_audit', action='LOGOUT').first()
        self.assertIsNotNone(logout_log)

    def test_failed_login_creates_activity_logs(self):
        # Failed login due to bad password
        res = self.client.post(self.login_url, {
            'username': 'regular_test_audit',
            'password': 'wrong_password'
        })
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Verify FAILED_LOGIN log was created
        log = UserActivityLog.objects.filter(username='regular_test_audit', action='FAILED_LOGIN').first()
        self.assertIsNotNone(log)

    def test_activity_logs_permissions(self):
        # Regular user login
        res = self.client.post(self.login_url, {
            'username': 'regular_test_audit',
            'password': 'regular_password_123'
        })
        token = res.data['token']

        # 1. Regular user gets 403 Forbidden on activity logs endpoint
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        res_logs = self.client.get(self.activity_logs_url)
        self.assertEqual(res_logs.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Root user gets 200 OK
        res_root = self.client.post(self.login_url, {
            'username': 'root_test_audit',
            'password': 'root_password_123'
        })
        root_token = res_root.data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {root_token}')
        
        res_logs_root = self.client.get(self.activity_logs_url)
        self.assertEqual(res_logs_root.status_code, status.HTTP_200_OK)

    def test_active_sessions_list_and_termination(self):
        # 1. Login regular user to create a session
        res = self.client.post(self.login_url, {
            'username': 'regular_test_audit',
            'password': 'regular_password_123'
        })
        token = res.data['token']
        
        # Get active session from DB
        from users.models import UserSession
        session = UserSession.objects.filter(user=self.regular_user).first()
        self.assertIsNotNone(session)

        # 2. Login root user
        res_root = self.client.post(self.login_url, {
            'username': 'root_test_audit',
            'password': 'root_password_123'
        })
        root_token = res_root.data['token']

        # 3. Retrieve active sessions list as ROOT
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {root_token}')
        res_sessions = self.client.get('/api/active-sessions/')
        self.assertEqual(res_sessions.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res_sessions.data) >= 2) # regular user and root user sessions

        # 4. Revoke the regular user's session
        res_delete = self.client.delete(f'/api/active-sessions/{session.id}/')
        self.assertEqual(res_delete.status_code, status.HTTP_204_NO_CONTENT)

        # Verify session is deleted from DB
        self.assertFalse(UserSession.objects.filter(id=session.id).exists())

        # Verify activity log is created indicating forced expiration
        log = UserActivityLog.objects.filter(
            username='regular_test_audit',
            action='SESSION_EXPIRED',
            device__contains='Forced terminate by admin'
        ).first()
        self.assertIsNotNone(log)



