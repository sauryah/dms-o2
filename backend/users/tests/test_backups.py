import os
import hashlib
import subprocess
from unittest.mock import patch, MagicMock
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from users.models import UserSession

User = get_user_model()

class BackupTests(APITestCase):
    def setUp(self):
        # Create a root user and a regular user
        self.root_user = User.objects.create_user(
            username='root_test',
            password='root_password_123',
            email='root@dms.local',
            role='ROOT'
        )
        self.regular_user = User.objects.create_user(
            username='regular_test',
            password='regular_password_123',
            email='regular@dms.local',
            role='REGULAR'
        )

        # Generate tokens
        self.root_token = str(AccessToken.for_user(self.root_user))
        self.regular_token = str(AccessToken.for_user(self.regular_user))

        # Create corresponding UserSessions so CustomJWTAuthentication validates them
        root_token_hash = hashlib.sha256(self.root_token.encode('utf-8')).hexdigest()
        UserSession.objects.create(
            user=self.root_user,
            token_hash=root_token_hash,
            ip_address='127.0.0.1',
            device='test-device'
        )

        regular_token_hash = hashlib.sha256(self.regular_token.encode('utf-8')).hexdigest()
        UserSession.objects.create(
            user=self.regular_user,
            token_hash=regular_token_hash,
            ip_address='127.0.0.1',
            device='test-device'
        )

        # URL for restore backup action
        self.restore_url = '/api/v1/backups/restore/'

    def test_restore_unauthenticated_fails(self):
        response = self.client.post(self.restore_url, {'filename': 'backup.dump'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_restore_non_root_fails(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.regular_token}')
        response = self.client.post(self.restore_url, {'filename': 'backup.dump'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('os.path.exists')
    @patch('users.tasks.restore_backup_task.delay')
    def test_restore_success(self, mock_delay, mock_exists):
        # Mock file checks
        mock_exists.return_value = True

        mock_task = MagicMock()
        mock_task.id = 'test-task-uuid'
        mock_delay.return_value = mock_task

        # Perform the request as root
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.root_token}')
        response = self.client.post(self.restore_url, {'filename': 'backup.dump'})

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data, {'status': 'pending', 'task_id': 'test-task-uuid'})

        # Verify the Celery task was scheduled asynchronously
        mock_delay.assert_called_once()

    @patch('subprocess.run')
    @patch('os.path.getsize')
    @patch('os.path.exists')
    @patch('users.services.backup_service.BackupService.list_backups')
    def test_verify_backup_restorability_task_success(self, mock_list, mock_exists, mock_getsize, mock_run):
        from users.tasks import verify_backup_restorability_task

        mock_list.return_value = [{'filename': 'dms_backup_test.dump', 'size_kb': 1024, 'created_at': 1700000000}]
        mock_exists.return_value = True
        mock_getsize.return_value = 1048576
        mock_run.return_value = MagicMock(returncode=0)

        result = verify_backup_restorability_task()
        self.assertEqual(result['status'], 'success')
        self.assertEqual(result['filename'], 'dms_backup_test.dump')

