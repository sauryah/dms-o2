from rest_framework import viewsets
from machines.models import Set
from machines.serializers import SetSerializer
from users.permissions import IsAdminOrRoot

class SetViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing machine die sets.

    Sets belong to machines and can contain assigned dies.

    **Operations:**
    - List all sets: GET `/api/sets/`
    - Create set: POST `/api/sets/`
    - Retrieve set: GET `/api/sets/{id}/`
    - Update set: PUT/PATCH `/api/sets/{id}/`
    - Delete set: DELETE `/api/sets/{id}/`

    **Permissions:** ADMIN or ROOT user only
    **Authentication:** Required (JWT Bearer token)
    """
    queryset = Set.objects.select_related('machine__category').all()
    serializer_class = SetSerializer
    permission_classes = [IsAdminOrRoot]
    pagination_class = None

