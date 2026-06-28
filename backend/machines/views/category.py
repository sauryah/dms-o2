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
            detail_msg = f"Cannot delete Machine Category '{instance.name}' because it has {count} active machines assigned to it. Reassign or delete the machines first."
            return Response({"detail": detail_msg}, status=status.HTTP_400_BAD_REQUEST)

