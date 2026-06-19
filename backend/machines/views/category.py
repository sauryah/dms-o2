from rest_framework import viewsets
from machines.models import MachineCategory
from machines.serializers import MachineCategorySerializer
from users.permissions import IsAdminOrRoot

class MachineCategoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing machine categories/types.
    
    Categories group machines by type (e.g., Stamping, Punching, Bending).
    
    **Operations:**
    - List all categories: GET `/api/categories/`
    - Create category: POST `/api/categories/`
    - Retrieve category: GET `/api/categories/{id}/`
    - Update category: PUT/PATCH `/api/categories/{id}/`
    - Delete category: DELETE `/api/categories/{id}/`
    
    **Permissions:** ADMIN or ROOT user only
    **Authentication:** Required (JWT Bearer token)
    """
    queryset = MachineCategory.objects.all()
    serializer_class = MachineCategorySerializer
    permission_classes = [IsAdminOrRoot]
