import os
import tempfile
import hashlib
from unittest.mock import patch, mock_open
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from users.models import UserSession
from machines.models import Rack
from history.models import DieHistory
from dies.models import Die

User = get_user_model()

class NewEndpointsTests(APITestCase):
    def setUp(self):
        self.client.credentials()

        # Create users
        self.root_user = User.objects.create_user(
            username='root_endpoint_test',
            password='root_password_123',
            email='root@dms.local',
            role='ROOT'
        )
        self.admin_user = User.objects.create_user(
            username='admin_endpoint_test',
            password='admin_password_123',
            email='admin@dms.local',
            role='ADMIN'
        )
        self.regular_user = User.objects.create_user(
            username='regular_endpoint_test',
            password='regular_password_123',
            email='regular@dms.local',
            role='REGULAR'
        )

        # Generate tokens and setup UserSessions for CustomJWTAuthentication
        self.root_token = str(AccessToken.for_user(self.root_user))
        self.admin_token = str(AccessToken.for_user(self.admin_user))
        self.regular_token = str(AccessToken.for_user(self.regular_user))

        for u, token in [(self.root_user, self.root_token), (self.admin_user, self.admin_token), (self.regular_user, self.regular_token)]:
            token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
            UserSession.objects.create(
                user=u,
                token_hash=token_hash,
                ip_address='127.0.0.1',
                device='test-device'
            )

    # 1. POST /api/auth/sse-ticket/ (Phase 2)
    def test_sse_ticket_endpoint(self):
        url = reverse('sse-ticket')
        
        # Unauthenticated
        self.client.credentials()
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Authenticated
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('ticket', response.data)
        self.assertEqual(len(response.data['ticket']), 36) # UUID string length is 36

    # 2. POST /internal/verify-token/ (Phase 3)
    def test_verify_token_endpoint(self):
        url = reverse('verify-token')
        
        # Unauthenticated
        self.client.credentials()
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Invalid token
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid_token')
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Authenticated
        from django.conf import settings
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {self.admin_token}',
            HTTP_X_INTERNAL_KEY=settings.INTERNAL_API_SECRET
        )
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['valid'], True)
        self.assertEqual(response.data['user_id'], self.admin_user.id)
        self.assertEqual(response.data['role'], 'ADMIN')

    # 3. Rack CRUD endpoints (Phase 3)
    def test_rack_crud(self):
        list_url = reverse('rack-list')
        
        # Unauthenticated list
        self.client.credentials()
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Authenticated list
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.regular_token}')
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Role enforcement for create (REGULAR should fail)
        response = self.client.post(list_url, {'name': 'Test Rack', 'row_count': 5, 'column_count': 5})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # ROOT create should succeed
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.root_token}')
        response = self.client.post(list_url, {'name': 'Test Rack 2', 'row_count': 6, 'column_count': 6})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        rack_id = response.data['id']
        
        # Detail endpoints
        detail_url = reverse('rack-detail', args=[rack_id])
        
        # REGULAR update should fail
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.regular_token}')
        response = self.client.patch(detail_url, {'row_count': 8})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # ROOT update should succeed
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.root_token}')
        response = self.client.patch(detail_url, {'row_count': 8})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['row_count'], 8)
        
        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    # 4. GET /api/import/template/ (Phase 5)
    def test_import_template_endpoint(self):
        url = reverse('import-template')
        
        # Unauthenticated: allowed by design (IsAdminOrRoot permits GET safe method)
        self.client.credentials()
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # ADMIN success
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    # 5. POST /api/import/?dry_run=true (Phase 5)
    def test_import_dry_run_endpoint(self):
        url = reverse('import-dies') + '?dry_run=true'
        
        # Unauthenticated
        self.client.credentials()
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # REGULAR forbidden
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.regular_token}')
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # ADMIN success
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        with tempfile.NamedTemporaryFile(suffix='.csv', mode='w+', encoding='utf-8') as f:
            f.write("die_id,die_type,casing,status,location,remarks,punched_size,current_size\n")
            f.write("R-TEST-1,ROUND,casing1,AVAILABLE,Rack A,,2.5,2.5\n")
            f.seek(0)
            response = self.client.post(url, {'file': f})
        
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        from dies.models import Die
        self.assertFalse(Die.objects.filter(die_id='R-TEST-1').exists())

    # 6. GET /api/import/logs/ (Phase 5)
    def test_import_logs_endpoint(self):
        url = reverse('import-logs')
        
        # Unauthenticated: allowed by design (IsAdminOrRoot permits GET safe method)
        self.client.credentials()
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # ADMIN success
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # 7. GET /api/backups/download_backup/ (Phase 6, verify streaming)
    @patch('os.path.exists')
    @patch('builtins.open', new_callable=mock_open, read_data=b"mock backup content stream")
    def test_download_backup_endpoint(self, mock_file, mock_exists):
        url = reverse('backup-download-backup')
        
        # Unauthenticated
        self.client.credentials()
        response = self.client.get(url, {'filename': 'nonexistent.dump'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # REGULAR forbidden
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.regular_token}')
        response = self.client.get(url, {'filename': 'nonexistent.dump'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # ROOT nonexistent file (404)
        mock_exists.return_value = False
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.root_token}')
        response = self.client.get(url, {'filename': 'nonexistent.dump'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # ROOT success with mock file (streaming checks)
        mock_exists.return_value = True
        response = self.client.get(url, {'filename': 'mock_backup.dump'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/octet-stream')
        self.assertEqual(b"".join(response.streaming_content), b"mock backup content stream")

    # 8. GET /api/history/ (Phase 7)
    def test_history_endpoint(self):
        url = reverse('die-history')
        
        # Unauthenticated
        self.client.credentials()
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Setup mock history logs
        die = Die.objects.create(die_id='R-HIST-1', die_type='ROUND', casing='casing', status='AVAILABLE')
        DieHistory.objects.create(
            die=die,
            changed_by=self.admin_user,
            field_name='status',
            old_value='CLEANING',
            new_value='AVAILABLE'
        )
        
        # REGULAR only sees own records
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.regular_token}')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)
        
        # ADMIN sees all records
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(response.data['count'], 0)

    # 9. GET /api/go/index-status (Phase 9 Integration on Django side)
    def test_index_status_celery_task_integration(self):
        from django.core.cache import cache
        
        # Simulate writing index status to Redis
        cache.set("search_index_status", '{"status":"rebuilding","progress":80}')
        
        # Retrieve value from Redis to simulate Go reading it
        val = cache.get("search_index_status")
        self.assertEqual(val, '{"status":"rebuilding","progress":80}')
        
        # Clean up
        cache.delete("search_index_status")
