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
    Permission check: only ROOT users can view or execute actions globally.
    Authenticated users can retrieve or update their own user profile.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == 'ROOT' or request.user.is_superuser:
            return True
        # Allow non-ROOT users to retrieve or update detail views (has_object_permission checks ownership)
        if view.action in ['retrieve', 'update', 'partial_update']:
            return True
        return False

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ROOT' or request.user.is_superuser:
            return True
        return request.user == obj


class IsAdminOrRootOrOperatorRelocate(permissions.BasePermission):
    """
    Permission check:
    - Safe methods (GET, HEAD, OPTIONS) are allowed for any authenticated user.
    - ROOT and ADMIN can write any fields.
    - OPERATOR can only PATCH (partial_update) location, rack, and shelf fields.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
            
        if not (request.user and request.user.is_authenticated):
            return False
            
        if request.user.role in ['ADMIN', 'ROOT'] or request.user.is_superuser:
            return True
            
        # Allow OPERATOR to partial_update (PATCH) only
        if request.user.role == 'OPERATOR' and request.method == 'PATCH':
            return True
            
        return False

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
            
        if request.user.role in ['ADMIN', 'ROOT'] or request.user.is_superuser:
            return True
            
        if request.user.role == 'OPERATOR' and request.method == 'PATCH':
            # Check what fields are being updated in request.data
            allowed_fields = {'location', 'rack', 'shelf'}
            for key in request.data.keys():
                if key not in allowed_fields:
                    return False
            return True
            
        return False


class IsAdminOrRootOnly(permissions.BasePermission):
    """
    Permission check: only ROOT or ADMIN users can read or write.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.role in ['ADMIN', 'ROOT'] or request.user.is_superuser)
        )

