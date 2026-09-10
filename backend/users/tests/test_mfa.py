from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User, UserBackupCode, UserActivityLog, UserSession


class BackupCodesTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = "Secur3P@ssw0rd!123"
        self.user = User.objects.create_user(
            username="backup_user",
            password=self.password,
            email="backup@example.com",
            role="ADMIN"
        )

    def test_backup_codes_full_lifecycle(self):
        # 1. Login normally without backup codes
        login_res = self.client.post(reverse('login'), {
            'username': self.user.username,
            'password': self.password,
        })
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertIn('token', login_res.data)
        self.assertFalse(login_res.data.get('mfa_required', False))
        token = login_res.data['token']

        # Authenticate client
        auth_client = APIClient()
        auth_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # 2. Initial backup codes status (disabled)
        status_res = auth_client.get(reverse('backup-codes-status'))
        self.assertEqual(status_res.status_code, status.HTTP_200_OK)
        self.assertFalse(status_res.data['is_enabled'])
        self.assertEqual(status_res.data['total_codes'], 0)

        # 3. Generate initial backup codes
        gen_res = auth_client.post(reverse('backup-codes-generate'), {})
        self.assertEqual(gen_res.status_code, status.HTTP_200_OK)
        self.assertIn('codes', gen_res.data)
        self.assertEqual(gen_res.data['count'], 10)
        codes = gen_res.data['codes']
        self.assertEqual(len(codes), 10)
        for c in codes:
            self.assertEqual(len(c), 9)  # XXXX-XXXX
            self.assertIn('-', c)

        self.user.refresh_from_db()
        self.assertTrue(self.user.is_mfa_enabled)
        self.assertEqual(self.user.backup_codes.count(), 10)
        self.assertEqual(self.user.backup_codes.filter(is_used=False).count(), 10)

        # 4. Check status & MeView with active codes
        status_res = auth_client.get(reverse('backup-codes-status'))
        self.assertTrue(status_res.data['is_enabled'])
        self.assertEqual(status_res.data['total_codes'], 10)
        self.assertEqual(status_res.data['unused_codes'], 10)
        self.assertEqual(status_res.data['used_codes'], 0)

        me_res = auth_client.get(reverse('auth-me'))
        self.assertTrue(me_res.data['is_mfa_enabled'])
        self.assertEqual(me_res.data['backup_codes_total'], 10)
        self.assertEqual(me_res.data['backup_codes_remaining'], 10)

        # 5. Attempt login with credentials -> should require backup code challenge
        login_mfa_res = self.client.post(reverse('login'), {
            'username': self.user.username,
            'password': self.password,
        })
        self.assertEqual(login_mfa_res.status_code, status.HTTP_200_OK)
        self.assertTrue(login_mfa_res.data.get('mfa_required'))
        self.assertIn('mfa_token', login_mfa_res.data)
        self.assertEqual(login_mfa_res.data.get('remaining_codes'), 10)
        mfa_token = login_mfa_res.data['mfa_token']

        # 6. Verify login with invalid code
        bad_verify_res = self.client.post(reverse('backup-codes-verify'), {
            'mfa_token': mfa_token,
            'code': 'INVALID1'
        })
        self.assertEqual(bad_verify_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 7. Verify login with valid first code (formatted XXXX-XXXX)
        code_1 = codes[0]
        verify_res = self.client.post(reverse('backup-codes-verify'), {
            'mfa_token': mfa_token,
            'code': code_1
        })
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)
        self.assertIn('token', verify_res.data)
        self.assertEqual(verify_res.data['role'], 'ADMIN')

        # Check that code_1 is now marked used
        self.user.refresh_from_db()
        self.assertEqual(self.user.backup_codes.filter(is_used=True).count(), 1)
        self.assertEqual(self.user.backup_codes.filter(is_used=False).count(), 9)

        # 8. Attempt login reusing the SAME code_1 -> MUST FAIL (Single-use enforcement)
        login_mfa_res2 = self.client.post(reverse('login'), {
            'username': self.user.username,
            'password': self.password,
        })
        mfa_token2 = login_mfa_res2.data['mfa_token']

        reuse_res = self.client.post(reverse('backup-codes-verify'), {
            'mfa_token': mfa_token2,
            'code': code_1
        })
        self.assertEqual(reuse_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 9. Verify login with second code without hyphens and in lowercase (normalization check)
        code_2_raw = codes[1].replace('-', '').lower()
        verify_res2 = self.client.post(reverse('backup-codes-verify'), {
            'mfa_token': mfa_token2,
            'code': code_2_raw
        })
        self.assertEqual(verify_res2.status_code, status.HTTP_200_OK)
        self.assertEqual(self.user.backup_codes.filter(is_used=False).count(), 8)

        # 10. Regenerate backup codes with password verification
        new_token = verify_res2.data['token']
        new_auth_client = APIClient()
        new_auth_client.credentials(HTTP_AUTHORIZATION=f'Bearer {new_token}')

        # Wrong password fails
        bad_regen_res = new_auth_client.post(reverse('backup-codes-generate'), {
            'password': 'WrongPassword123!'
        })
        self.assertEqual(bad_regen_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Correct password succeeds
        regen_res = new_auth_client.post(reverse('backup-codes-generate'), {
            'password': self.password
        })
        self.assertEqual(regen_res.status_code, status.HTTP_200_OK)
        new_codes = regen_res.data['codes']
        self.assertEqual(len(new_codes), 10)
        self.assertEqual(self.user.backup_codes.filter(is_used=False).count(), 10)

        # 11. Disable backup codes
        bad_disable_res = new_auth_client.post(reverse('backup-codes-disable'), {
            'password': 'WrongPassword123!'
        })
        self.assertEqual(bad_disable_res.status_code, status.HTTP_400_BAD_REQUEST)

        disable_res = new_auth_client.post(reverse('backup-codes-disable'), {
            'password': self.password
        })
        self.assertEqual(disable_res.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertFalse(self.user.is_mfa_enabled)
        self.assertEqual(self.user.backup_codes.count(), 0)

        # 12. Login after disabling -> logs in directly without challenge
        direct_login_res = self.client.post(reverse('login'), {
            'username': self.user.username,
            'password': self.password,
        })
        self.assertEqual(direct_login_res.status_code, status.HTTP_200_OK)
        self.assertFalse(direct_login_res.data.get('mfa_required', False))
