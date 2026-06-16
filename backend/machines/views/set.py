from rest_framework import viewsets
from machines.models import Set
from machines.serializers import SetSerializer
from users.permissions import IsAdminOrRoot

class SetViewSet(viewsets.ModelViewSet):
    queryset = Set.objects.select_related('machine__category').all()
    serializer_class = SetSerializer
    permission_classes = [IsAdminOrRoot]
