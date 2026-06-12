from django.test import TestCase
from django.conf import settings
from django.urls import reverse
from users.models import User

class AdminLoginTests(TestCase):
    def setUp(self):
        self.username = settings.ROOT_USERNAME
        self.password = settings.ROOT_PASSWORD
        self.user = User.objects.create_superuser(
            username=self.username,
            password=self.password,
            email='root@dms.local',
            role='ROOT'
        )

    def test_admin_login_works(self):
        login_url = reverse('admin:login')
        get_response = self.client.get(login_url)
        csrf_token = get_response.cookies.get('csrftoken')
        csrf_token_value = csrf_token.value if csrf_token else ''
        
        response = self.client.post(login_url, {
            'username': self.username,
            'password': self.password,
            'csrfmiddlewaretoken': csrf_token_value,
            'next': '/admin/'
        })
        
        self.assertEqual(response.status_code, 302)
        self.assertTrue('/admin/' in response.url or response.url.endswith('/admin/'))
