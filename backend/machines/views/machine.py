from rest_framework import viewsets
from machines.models import Machine
from machines.serializers import MachineSerializer
from users.permissions import IsAdminOrRoot

class MachineViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing machines/equipment.
    
    Machines are physical equipment that hold die sets during production.
    Each machine belongs to a category and can hold multiple die sets.
    
    **Operations:**
    - List all machines: GET `/api/machines/`
    - Create machine: POST `/api/machines/`
    - Retrieve machine: GET `/api/machines/{id}/`
    - Update machine: PUT/PATCH `/api/machines/{id}/`
    - Delete machine: DELETE `/api/machines/{id}/`
    
    **Example Machine:**
    ```json
    {
      "id": 1,
      "name": "Stamping Press #1",
      "category": 5,
      "location": "Factory Floor A",
      "status": "ACTIVE"
    }
    ```
    
    **Permissions:** ADMIN or ROOT user only
    **Authentication:** Required (JWT Bearer token)
    """
    queryset = Machine.objects.select_related('category').all()
    serializer_class = MachineSerializer
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
            detail_msg = f"Cannot delete Machine '{instance.name}' because it has {count} active die sets assigned to it. Reassign or delete the sets first."
            return Response({"detail": detail_msg}, status=status.HTTP_400_BAD_REQUEST)

