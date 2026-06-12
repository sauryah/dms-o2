from rest_framework import viewsets
from machines.models import MachineCategory, Machine, Set
from machines.serializers import MachineCategorySerializer, MachineSerializer, SetSerializer
from users.permissions import IsAdminOrRoot

class MachineCategoryViewSet(viewsets.ModelViewSet):
    queryset = MachineCategory.objects.all()
    serializer_class = MachineCategorySerializer
    permission_classes = [IsAdminOrRoot]

class MachineViewSet(viewsets.ModelViewSet):
    queryset = Machine.objects.select_related('category').all()
    serializer_class = MachineSerializer
    permission_classes = [IsAdminOrRoot]

class SetViewSet(viewsets.ModelViewSet):
    queryset = Set.objects.select_related('machine__category').all()
    serializer_class = SetSerializer
    permission_classes = [IsAdminOrRoot]
