from rest_framework import permissions

class IsAdminOrRoot(permissions.BasePermission):
    """
    Permission check: unauthenticated users can view (SAFE_METHODS),
    but only ROOT or ADMIN users can write.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.role in ['ADMIN', 'ROOT'] or request.user.is_superuser)
        )

class IsRootOnly(permissions.BasePermission):
    """
    Permission check: only ROOT users can view or execute.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.role == 'ROOT' or request.user.is_superuser)
        )
