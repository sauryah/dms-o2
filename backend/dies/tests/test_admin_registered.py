from django.test import TestCase
from django.conf import settings
from django.urls import reverse
from users.models import User

class AdminRegisteredModelTests(TestCase):
    def setUp(self):
        self.username = settings.ROOT_USERNAME
        self.password = settings.ROOT_PASSWORD
        self.user = User.objects.create_superuser(
            username=self.username,
            password=self.password,
            email='root@dms.local',
            role='ROOT'
        )
        self.client.login(username=self.username, password=self.password)

    def test_admin_index_contains_registered_models(self):
        response = self.client.get(reverse('admin:index'))
        self.assertEqual(response.status_code, 200)
        content = response.content.decode('utf-8')
        
        self.assertIn('Dies', content)
        self.assertIn('Round dies', content)
        self.assertIn('Flat dies', content)
        self.assertIn('Die historys', content)
