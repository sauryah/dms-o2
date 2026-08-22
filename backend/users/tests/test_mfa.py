import pyotp
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User, UserActivityLog, UserSession


class MFATests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = "Secur3P@ssw0rd!123"
        self.user = User.objects.create_user(
            username="mfa_user",
            password=self.password,
            email="mfa@example.com",
            role="ADMIN"
        )

    def test_mfa_full_lifecycle(self):
        # 1. Login normally without MFA
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

        # 2. Setup MFA
        setup_res = auth_client.post(reverse('mfa-setup'))
        self.assertEqual(setup_res.status_code, status.HTTP_200_OK)
        self.assertIn('secret', setup_res.data)
        self.assertIn('otpauth_uri', setup_res.data)
        self.assertIn('qr_code', setup_res.data)
        secret = setup_res.data['secret']

        # 3. Try to enable with wrong code
        bad_enable_res = auth_client.post(reverse('mfa-enable'), {'code': '000000'})
        self.assertEqual(bad_enable_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_mfa_enabled)

        # 4. Enable with correct TOTP code
        totp = pyotp.TOTP(secret)
        valid_code = totp.now()
        enable_res = auth_client.post(reverse('mfa-enable'), {'code': valid_code})
        self.assertEqual(enable_res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_mfa_enabled)
        self.assertEqual(self.user.totp_secret, secret)

        # 5. Attempt login with credentials -> should require MFA challenge
        login_mfa_res = self.client.post(reverse('login'), {
            'username': self.user.username,
            'password': self.password,
        })
        self.assertEqual(login_mfa_res.status_code, status.HTTP_200_OK)
        self.assertTrue(login_mfa_res.data.get('mfa_required'))
        self.assertIn('mfa_token', login_mfa_res.data)
        mfa_token = login_mfa_res.data['mfa_token']

        # 6. Verify login with invalid code
        bad_verify_res = self.client.post(reverse('mfa-verify'), {
            'mfa_token': mfa_token,
            'code': '123456'
        })
        self.assertEqual(bad_verify_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 7. Verify login with valid code
        current_code = totp.now()
        verify_res = self.client.post(reverse('mfa-verify'), {
            'mfa_token': mfa_token,
            'code': current_code
        })
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)
        self.assertIn('token', verify_res.data)
        self.assertEqual(verify_res.data['role'], 'ADMIN')

        # 8. Disable MFA with incorrect password
        new_token = verify_res.data['token']
        new_auth_client = APIClient()
        new_auth_client.credentials(HTTP_AUTHORIZATION=f'Bearer {new_token}')

        bad_disable_res = new_auth_client.post(reverse('mfa-disable'), {
            'password': 'WrongPassword123!',
            'code': totp.now()
        })
        self.assertEqual(bad_disable_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 9. Disable MFA with correct password and TOTP code
        disable_res = new_auth_client.post(reverse('mfa-disable'), {
            'password': self.password,
            'code': totp.now()
        })
        self.assertEqual(disable_res.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_mfa_enabled)
        self.assertEqual(self.user.totp_secret, '')
