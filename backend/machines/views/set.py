from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import action
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
    queryset = Set.objects.select_related('machine__category').annotate(die_count=Count('die')).order_by('order', 'name')
    serializer_class = SetSerializer
    permission_classes = [IsAdminOrRoot]
    pagination_class = None

    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder(self, request):
        from rest_framework.response import Response
        from rest_framework import status
        from machines.models import Machine

        machine_id = request.data.get('machine_id')
        ordered_set_ids = request.data.get('ordered_set_ids')
        if not machine_id or not ordered_set_ids:
            return Response({"detail": "machine_id and ordered_set_ids are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            target_machine = Machine.objects.get(id=machine_id)
        except Machine.DoesNotExist:
            return Response({"detail": "Target machine does not exist."}, status=status.HTTP_404_NOT_FOUND)

        # Get all sets in the list
        sets = Set.objects.filter(id__in=ordered_set_ids)
        set_dict = {s.id: s for s in sets}
        
        # Update machine and orders
        updated_sets = []
        for index, set_id in enumerate(ordered_set_ids):
            try:
                set_id = int(set_id)
            except (ValueError, TypeError):
                continue
            if set_id in set_dict:
                set_obj = set_dict[set_id]
                if set_obj.machine_id != target_machine.id:
                    set_obj.machine = target_machine
                set_obj.order = index
                updated_sets.append(set_obj)
        
        from django.db import transaction
        with transaction.atomic():
            for set_obj in updated_sets:
                set_obj.save()
        return Response({"status": "success"})

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
