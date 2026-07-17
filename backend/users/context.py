import contextvars

_current_user_var: contextvars.ContextVar = contextvars.ContextVar('current_user', default=None)
_current_ip_var: contextvars.ContextVar = contextvars.ContextVar('current_ip', default=None)
_skip_single_sync_var: contextvars.ContextVar = contextvars.ContextVar('skip_single_sync', default=False)
_pending_sync_die_ids_var: contextvars.ContextVar = contextvars.ContextVar('pending_sync_die_ids', default=None)
_pending_broadcast_keys_var: contextvars.ContextVar = contextvars.ContextVar('pending_broadcast_keys', default=None)


class _ThreadLocalsProxy:
    """Proxy object that exposes contextvars via attribute access for backward compatibility."""

    @property
    def user(self):
        return _current_user_var.get()

    @user.setter
    def user(self, value):
        _current_user_var.set(value)

    @property
    def ip(self):
        return _current_ip_var.get()

    @ip.setter
    def ip(self, value):
        _current_ip_var.set(value)

    @property
    def skip_single_sync(self):
        return _skip_single_sync_var.get()

    @skip_single_sync.setter
    def skip_single_sync(self, value):
        _skip_single_sync_var.set(value)

    @property
    def pending_sync_die_ids(self):
        return _pending_sync_die_ids_var.get()

    @pending_sync_die_ids.setter
    def pending_sync_die_ids(self, value):
        _pending_sync_die_ids_var.set(value)

    @property
    def pending_broadcast_keys(self):
        return _pending_broadcast_keys_var.get()

    @pending_broadcast_keys.setter
    def pending_broadcast_keys(self, value):
        _pending_broadcast_keys_var.set(value)


_thread_locals = _ThreadLocalsProxy()


def get_current_user():
    return _current_user_var.get()


def get_current_ip():
    return _current_ip_var.get()
