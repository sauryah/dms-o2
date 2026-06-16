from rest_framework import viewsets
from machines.models import Machine
from machines.serializers import MachineSerializer
from users.permissions import IsAdminOrRoot

class MachineViewSet(viewsets.ModelViewSet):
    queryset = Machine.objects.select_related('category').all()
    serializer_class = MachineSerializer
    permission_classes = [IsAdminOrRoot]
