from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch

class HealthCheckTests(APITestCase):
    def setUp(self):
        self.health_url = reverse('health')

    @patch('redis.Redis.ping')
    def test_health_check_healthy(self, mock_ping):
        # Mock Redis ping to succeed
        mock_ping.return_value = True

        response = self.client.get(self.health_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'healthy')
        self.assertEqual(response.data['database'], 'up')
        self.assertEqual(response.data['redis'], 'up')

    @patch('redis.Redis.ping')
    def test_health_check_database_unhealthy(self, mock_ping):
        # Mock Redis ping to succeed
        mock_ping.return_value = True

        from django.db import connection
        original_cursor = connection.cursor

        # Mock connection.cursor to return a cursor that raises error specifically for the test query
        def mock_cursor():
            real_cursor = original_cursor()
            real_execute = real_cursor.execute

            def mock_execute(sql, params=None):
                if sql and "SELECT 1" in sql:
                    raise Exception("DB Connection Timeout")
                return real_execute(sql, params)

            real_cursor.execute = mock_execute
            return real_cursor

        connection.cursor = mock_cursor
        try:
            response = self.client.get(self.health_url)
        finally:
            connection.cursor = original_cursor

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data['status'], 'unhealthy')
        self.assertIn('down', response.data['database'])
        self.assertEqual(response.data['redis'], 'up')

    @patch('redis.Redis.ping')
    def test_health_check_redis_unhealthy(self, mock_ping):
        # Mock Redis ping to fail
        mock_ping.side_effect = Exception("Redis connection refused")

        response = self.client.get(self.health_url)
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data['status'], 'unhealthy')
        self.assertEqual(response.data['database'], 'up')
        self.assertIn('down', response.data['redis'])
