from django.db.models import Count
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
    queryset = Set.objects.select_related('machine__category').annotate(die_count=Count('die')).all()
    serializer_class = SetSerializer
    permission_classes = [IsAdminOrRoot]
    pagination_class = None

    def destroy(self, request, *args, **kwargs):
        from django.db.models import ProtectedError
        from rest_framework.response import Response
        from rest_framework import status
        
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError as e:
            instance = self.get_object()
            count = len(e.protected_objects)
            detail_msg = f"Cannot delete Set '{instance.name}' because it has {count} active dies assigned to it. Reassign or delete the dies first."
            return Response({"detail": detail_msg}, status=status.HTTP_400_BAD_REQUEST)
