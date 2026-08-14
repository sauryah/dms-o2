from django.conf import settings
from users.context import _thread_locals
from users.views.auth import get_client_ip


class CurrentUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.user = getattr(request, 'user', None)
        _thread_locals.ip = get_client_ip(request)

        try:
            response = self.get_response(request)
        finally:
            _thread_locals.user = None
            _thread_locals.ip = None
            _thread_locals.pending_sync_die_ids = None
            _thread_locals.pending_broadcast_keys = None
        return response
