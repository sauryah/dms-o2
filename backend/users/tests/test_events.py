import json
from unittest.mock import patch
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from dms.events import broadcast_event

User = get_user_model()

class EventStreamTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password123', email='test@example.com')
        self.token = str(AccessToken.for_user(self.user))
        self.url = reverse('events')

    def test_unauthenticated_request_fails(self):
        # Request without token query param
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('Authentication token is required', response.data['error'])

    def test_invalid_token_request_fails(self):
        response = self.client.get(self.url, {'token': 'invalid_token'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('Invalid or expired token', response.data['error'])

    @patch('django.db.connection.ensure_connection')
    def test_successful_connection(self, mock_ensure_conn):
        # Test that request with valid token succeeds and returns a streaming response
        response = self.client.get(self.url, {'token': self.token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/event-stream')
        self.assertEqual(response['Cache-Control'], 'no-cache')
        self.assertEqual(response['X-Accel-Buffering'], 'no')

    @patch('django.db.connection.connection')
    def test_broadcast_event(self, mock_conn):
        # Test that broadcast_event executes pg_notify successfully
        mock_cursor = mock_conn.cursor.return_value
        broadcast_event('test_event', {'foo': 'bar'})
        mock_cursor.execute.assert_called_once()
        args = mock_cursor.execute.call_args[0]
        self.assertIn("SELECT pg_notify('dms_events', %s);", args[0])
