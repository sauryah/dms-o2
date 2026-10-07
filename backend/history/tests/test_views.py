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


from history.models import PrintRecord
from django.utils import timezone


class PrintRecordApiTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='admin_print_user',
            password='admin_print_password',
            role='ADMIN'
        )
        self.regular_user = User.objects.create_user(
            username='operator_print_user',
            password='operator_print_password',
            role='REGULAR'
        )
        self.login_url = reverse('login')
        self.next_ref_url = reverse('print-record-next-ref')
        self.print_records_url = reverse('print-records')

        from django.core.cache import cache
        cache.clear()
        import redis
        from django.conf import settings
        try:
            redis_url = settings.CACHES['default']['LOCATION']
            r = redis.Redis.from_url(redis_url)
            r.delete('login_attempts:admin_print_user', 'login_attempts:operator_print_user')
        except Exception:
            pass

    def _auth(self, username, password):
        res = self.client.post(self.login_url, {'username': username, 'password': password})
        token = res.data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_next_ref_requires_authentication(self):
        res = self.client.get(self.next_ref_url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_next_ref_increments_sequence(self):
        self._auth('operator_print_user', 'operator_print_password')
        today_str = timezone.now().strftime('%Y%m%d')

        res1 = self.client.get(self.next_ref_url)
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertTrue(res1.data['doc_ref'].startswith(f"TDS-{today_str}-"))
        self.assertTrue(res1.data['default_work_order'].startswith(f"WO-{today_str}-"))

        PrintRecord.objects.create(
            doc_ref=res1.data['doc_ref'],
            work_order=res1.data['default_work_order'],
            username='operator_print_user',
            user_role='OPERATOR',
            total_passes=12
        )

        res2 = self.client.get(self.next_ref_url)
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        seq1 = int(res1.data['doc_ref'].split('-')[-1])
        seq2 = int(res2.data['doc_ref'].split('-')[-1])
        self.assertEqual(seq2, seq1 + 1)

    def test_create_print_record_unauthenticated_denied(self):
        res = self.client.post(self.print_records_url, {
            'work_order': 'WO-TEST-001',
            'machine_name': 'Machine 01',
            'total_passes': 5
        })
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_print_record_regular_user_allowed_and_captures_metadata(self):
        self._auth('operator_print_user', 'operator_print_password')
        payload = {
            'doc_type': 'WIRE_DRAWING_TDS',
            'work_order': 'WO-20261007-099',
            'machine_name': 'Line 02',
            'material_profile': 'Standard Wire Drawing',
            'quality_status': 'EXCELLENT',
            'notes': 'Production run notes',
            'inlet_size': '2.490',
            'finish_size': '0.309',
            'total_passes': 18,
            'overall_reduction': '98.46',
            'avg_elongation': '26.24',
            'dies': [2.49, 2.217, 1.974],
            'passes_data': [{'pass': 1, 'fromDie': 2.49, 'toDie': 2.217}],
        }
        res = self.client.post(self.print_records_url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['username'], 'operator_print_user')
        self.assertEqual(res.data['user_role'], 'REGULAR')
        self.assertTrue(res.data['doc_ref'].startswith('TDS-'))
        self.assertEqual(res.data['work_order'], 'WO-20261007-099')

        record = PrintRecord.objects.get(id=res.data['id'])
        self.assertEqual(record.printed_by, self.regular_user)
        self.assertEqual(record.total_passes, 18)
        self.assertEqual(len(record.dies), 3)

    def test_create_print_record_handles_duplicate_doc_ref_gracefully(self):
        self._auth('operator_print_user', 'operator_print_password')
        PrintRecord.objects.create(
            doc_ref='TDS-20261007-9999',
            work_order='WO-EXISTING',
            username='someone',
            user_role='OPERATOR'
        )

        res = self.client.post(self.print_records_url, {
            'doc_ref': 'TDS-20261007-9999',
            'work_order': 'WO-NEW-001',
            'total_passes': 6
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(res.data['doc_ref'], 'TDS-20261007-9999')
        self.assertTrue(PrintRecord.objects.filter(doc_ref=res.data['doc_ref']).exists())

    def test_list_print_records_regular_user_denied(self):
        self._auth('operator_print_user', 'operator_print_password')
        res = self.client.get(self.print_records_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_print_records_admin_success_with_filters(self):
        PrintRecord.objects.create(
            doc_ref='TDS-20261007-0010',
            work_order='WO-ALPHA-100',
            machine_name='Line Alpha',
            username='operator_print_user',
            user_role='REGULAR',
            total_passes=10
        )
        PrintRecord.objects.create(
            doc_ref='TDS-20261007-0020',
            work_order='WO-BETA-200',
            machine_name='Line Beta',
            username='admin_print_user',
            user_role='ADMIN',
            total_passes=8
        )

        self._auth('admin_print_user', 'admin_print_password')
        res = self.client.get(self.print_records_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['count'], 2)

        res_filter = self.client.get(f"{self.print_records_url}?work_order=ALPHA")
        self.assertEqual(res_filter.status_code, status.HTTP_200_OK)
        self.assertEqual(res_filter.data['count'], 1)
        self.assertEqual(res_filter.data['results'][0]['doc_ref'], 'TDS-20261007-0010')
