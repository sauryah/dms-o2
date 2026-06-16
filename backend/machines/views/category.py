from rest_framework import viewsets
from machines.models import MachineCategory
from machines.serializers import MachineCategorySerializer
from users.permissions import IsAdminOrRoot

class MachineCategoryViewSet(viewsets.ModelViewSet):
    queryset = MachineCategory.objects.all()
    serializer_class = MachineCategorySerializer
    permission_classes = [IsAdminOrRoot]
