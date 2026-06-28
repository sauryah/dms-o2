from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsAdminOrRoot
from machines.models import Rack
from machines.serializers import RackSerializer

class RackViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing physical storage racks.
    
    **Operations:**
    - List all racks: GET `/api/racks/`
    - Retrieve a rack: GET `/api/racks/{id}/`
    - Create a rack: POST `/api/racks/` (Admin/Root only)
    - Update a rack: PUT/PATCH `/api/racks/{id}/` (Admin/Root only)
    - Delete a rack: DELETE `/api/racks/{id}/` (Admin/Root only, blocked if dies are stored on it)
    """
    queryset = Rack.objects.all()
    serializer_class = RackSerializer
    pagination_class = None

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdminOrRoot()]

    def destroy(self, request, *args, **kwargs):
        from rest_framework.response import Response
        from rest_framework import status
        
        instance = self.get_object()
        # Protect deletion if any dies are currently assigned to this rack
        assigned_dies_count = instance.die_set.count()
        if assigned_dies_count > 0:
            detail_msg = f"Cannot delete Rack '{instance.name}' because it has {assigned_dies_count} active dies assigned to it. Reassign or delete the dies first."
            return Response({"detail": detail_msg}, status=status.HTTP_400_BAD_REQUEST)
            
        return super().destroy(request, *args, **kwargs)
