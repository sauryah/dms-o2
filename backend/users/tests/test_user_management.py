import csv
import io
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.utils import timezone
from datetime import timedelta, date
from users.models import User, UserActivityLog, UserSession
import hashlib


class UserManagementTests(APITestCase):
    """Comprehensive tests for all new administration endpoints."""

    def setUp(self):
        self.root_user = User.objects.create_user(
            username='root_mgmt', password='rootpassword123', role='ROOT'
        )
        self.admin_user = User.objects.create_user(
            username='admin_mgmt', password='adminpassword123', role='ADMIN'
        )
        self.regular_user = User.objects.create_user(
            username='regular_mgmt', password='regularpassword123', role='REGULAR'
        )
        self.operator_user = User.objects.create_user(
            username='operator_mgmt', password='operatorpassword123', role='OPERATOR'
        )

        # Clear cache to avoid stale count results
        from django.core.cache import cache
        cache.clear()

    # ─── PAGINATION & FILTERING ──────────────────────────────────────────────

    def test_user_list_is_paginated(self):
        self.client.force_authenticate(user=self.root_user)
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)

    def test_user_filter_by_role(self):
        self.client.force_authenticate(user=self.root_user)
        response = self.client.get('/api/users/?role=REGULAR')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for user in response.data['results']:
            self.assertEqual(user['role'], 'REGULAR')

    def test_user_filter_by_status_active(self):
        self.client.force_authenticate(user=self.root_user)
        self.regular_user.is_active = False
        self.regular_user.save()
        response = self.client.get('/api/users/?status=active')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for user in response.data['results']:
            self.assertTrue(user['is_active'])

    def test_user_filter_by_status_inactive(self):
        self.client.force_authenticate(user=self.root_user)
        self.regular_user.is_active = False
        self.regular_user.save()
        response = self.client.get('/api/users/?status=inactive')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for user in response.data['results']:
            self.assertFalse(user['is_active'])

    def test_user_search_by_username(self):
        self.client.force_authenticate(user=self.root_user)
        response = self.client.get('/api/users/?search=regular_mgmt')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(u['username'] == 'regular_mgmt' for u in response.data['results']))

    def test_user_filter_by_tools_unauthorized(self):
        self.client.force_authenticate(user=self.root_user)
        response = self.client.get('/api/users/?tools=unauthorized')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for user in response.data['results']:
            self.assertFalse(user['is_authorized_for_tools'])

    def test_user_list_forbidden_for_non_root(self):
        """Only ROOT can list users."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ─── DATE RANGE FILTER ───────────────────────────────────────────────────

    def test_activity_log_date_from_filter(self):
        self.client.force_authenticate(user=self.root_user)
        UserActivityLog.objects.create(username='root_mgmt', action='LOGIN')
        today = date.today().isoformat()
        response = self.client.get(f'/api/activity-logs/?date_from={today}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_activity_log_date_to_filter(self):
        self.client.force_authenticate(user=self.root_user)
        UserActivityLog.objects.create(username='root_mgmt', action='LOGIN')
        today = date.today().isoformat()
        response = self.client.get(f'/api/activity-logs/?date_to={today}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_activity_log_date_range_invalid(self):
        """date_from after date_to should return 400."""
        self.client.force_authenticate(user=self.root_user)
        response = self.client.get('/api/activity-logs/?date_from=2026-08-10&date_to=2026-08-01')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_activity_log_date_to_future_rejected(self):
        """date_to more than 1 day in the future should return 400."""
        self.client.force_authenticate(user=self.root_user)
        far_future = (timezone.now() + timedelta(days=10)).date().isoformat()
        response = self.client.get(f'/api/activity-logs/?date_to={far_future}')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ─── SESSION SELF-EXCLUSION ───────────────────────────────────────────────

    def test_destroy_all_without_preserve_own(self):
        """Without preserve_own, all sessions are cleared."""
        self.client.force_authenticate(user=self.root_user)
        UserSession.objects.create(user=self.root_user, token_hash='abc123', ip_address='127.0.0.1')
        UserSession.objects.create(user=self.admin_user, token_hash='def456', ip_address='127.0.0.1')
        response = self.client.delete('/api/active-sessions/all/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(UserSession.objects.count(), 0)

    def test_destroy_all_with_preserve_own(self):
        """With preserve_own=true and a valid Bearer token, own session is excluded."""
        # Create a real session matching a token hash
        token_str = 'fake_token_string_12345'
        token_hash = hashlib.sha256(token_str.encode()).hexdigest()
        session = UserSession.objects.create(
            user=self.root_user, token_hash=token_hash, ip_address='127.0.0.1'
        )
        other_session = UserSession.objects.create(
            user=self.admin_user, token_hash='other_hash_value', ip_address='127.0.0.1'
        )

        self.client.force_authenticate(user=self.root_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_str}')
        response = self.client.delete('/api/active-sessions/all/?preserve_own=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Own session should still exist
        self.assertTrue(UserSession.objects.filter(token_hash=token_hash).exists())
        # Other session should be gone
        self.assertFalse(UserSession.objects.filter(token_hash='other_hash_value').exists())
        self.assertIn('preserved', response.data['detail'])

    # ─── BULK USER OPERATIONS ─────────────────────────────────────────────────

    def test_bulk_suspend(self):
        self.client.force_authenticate(user=self.root_user)
        response = self.client.post('/api/users/bulk_action/', {
            'action': 'suspend',
            'user_ids': [self.regular_user.id]
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(self.regular_user.id, response.data['succeeded'])
        self.regular_user.refresh_from_db()
        self.assertFalse(self.regular_user.is_active)

    def test_bulk_activate(self):
        self.regular_user.is_active = False
        self.regular_user.save()
        self.client.force_authenticate(user=self.root_user)
        response = self.client.post('/api/users/bulk_action/', {
            'action': 'activate',
            'user_ids': [self.regular_user.id]
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(self.regular_user.id, response.data['succeeded'])
        self.regular_user.refresh_from_db()
        self.assertTrue(self.regular_user.is_active)

    def test_bulk_delete(self):
        victim = User.objects.create_user(
            username='victim_user', password='password123', role='REGULAR'
        )
        self.client.force_authenticate(user=self.root_user)
        response = self.client.post('/api/users/bulk_action/', {
            'action': 'delete',
            'user_ids': [victim.id]
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(victim.id, response.data['succeeded'])
        self.assertFalse(User.objects.filter(id=victim.id).exists())

    def test_bulk_cannot_delete_root(self):
        root2 = User.objects.create_user(
            username='root2_user', password='password123', role='ROOT'
        )
        self.client.force_authenticate(user=self.root_user)
        response = self.client.post('/api/users/bulk_action/', {
            'action': 'delete',
            'user_ids': [root2.id]
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(root2.id, [f['id'] for f in response.data['failed']])
        self.assertTrue(User.objects.filter(id=root2.id).exists())

    def test_bulk_cannot_act_on_self(self):
        self.client.force_authenticate(user=self.root_user)
        response = self.client.post('/api/users/bulk_action/', {
            'action': 'suspend',
            'user_ids': [self.root_user.id]
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(self.root_user.id, [f['id'] for f in response.data['failed']])

    def test_bulk_invalid_action(self):
        self.client.force_authenticate(user=self.root_user)
        response = self.client.post('/api/users/bulk_action/', {
            'action': 'nuke',
            'user_ids': [self.regular_user.id]
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bulk_empty_ids(self):
        self.client.force_authenticate(user=self.root_user)
        response = self.client.post('/api/users/bulk_action/', {
            'action': 'activate',
            'user_ids': []
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ─── USER EXPORT ─────────────────────────────────────────────────────────

    def test_export_endpoint_returns_csv(self):
        self.client.force_authenticate(user=self.root_user)
        response = self.client.get('/api/users/export/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('text/csv', response['Content-Type'])
        self.assertIn('attachment', response['Content-Disposition'])

    def test_export_csv_content(self):
        self.client.force_authenticate(user=self.root_user)
        response = self.client.get('/api/users/export/')
        content = b''.join(response.streaming_content) if hasattr(response, 'streaming_content') else response.content
        reader = csv.DictReader(io.StringIO(content.decode('utf-8')))
        rows = list(reader)
        usernames = [row['username'] for row in rows]
        self.assertIn('root_mgmt', usernames)
        # Passwords must never appear in export
        headers = reader.fieldnames or []
        self.assertNotIn('password', headers)

    def test_export_forbidden_for_non_root(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/users/export/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ─── ADMIN COUNTS ────────────────────────────────────────────────────────

    def test_counts_endpoint_structure(self):
        self.client.force_authenticate(user=self.root_user)
        response = self.client.get('/api/users/counts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertIn('total_users', data)
        self.assertIn('active_users', data)
        self.assertIn('inactive_users', data)
        self.assertIn('by_role', data)
        self.assertIn('active_sessions', data)
        self.assertIn('recent_failed_logins_24h', data)
        self.assertIn('total_backups', data)

    def test_counts_total_users(self):
        self.client.force_authenticate(user=self.root_user)
        response = self.client.get('/api/users/counts/')
        # We have 4 users (root, admin, regular, operator)
        self.assertEqual(response.data['total_users'], 4)

    def test_counts_forbidden_for_non_root(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/users/counts/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_counts_recent_failed_logins(self):
        # Create a recent failed login
        UserActivityLog.objects.create(
            username='attacker', action='FAILED_LOGIN',
            timestamp=timezone.now() - timedelta(hours=1)
        )
        self.client.force_authenticate(user=self.root_user)
        # Clear cache so counts recalculate
        from django.core.cache import cache
        cache.delete('admin_user_counts')
        response = self.client.get('/api/users/counts/')
        self.assertGreaterEqual(response.data['recent_failed_logins_24h'], 1)

    # ─── PASSWORD POLICY ─────────────────────────────────────────────────────

    def test_password_policy_accessible_to_any_authenticated(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/users/password_policy/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('rules', response.data)
        self.assertIsInstance(response.data['rules'], list)
        self.assertGreater(len(response.data['rules']), 0)

    def test_password_policy_unauthenticated_denied(self):
        response = self.client.get('/api/users/password_policy/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ─── AUDIT LOGGING ───────────────────────────────────────────────────────

    def test_user_creation_is_audited(self):
        self.client.force_authenticate(user=self.root_user)
        initial_count = UserActivityLog.objects.filter(action='USER_CREATED').count()
        self.client.post('/api/users/', {
            'username': 'new_audit_user',
            'password': 'securepassword123',
            'role': 'REGULAR'
        }, format='json')
        self.assertEqual(
            UserActivityLog.objects.filter(action='USER_CREATED').count(),
            initial_count + 1
        )

    def test_user_deletion_is_audited(self):
        target = User.objects.create_user(
            username='delete_me', password='password123', role='REGULAR'
        )
        self.client.force_authenticate(user=self.root_user)
        initial_count = UserActivityLog.objects.filter(action='USER_DELETED').count()
        self.client.delete(f'/api/users/{target.id}/')
        self.assertEqual(
            UserActivityLog.objects.filter(action='USER_DELETED').count(),
            initial_count + 1
        )
