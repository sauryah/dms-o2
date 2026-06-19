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
