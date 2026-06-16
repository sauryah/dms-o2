from rest_framework import serializers
from machines.models import MachineCategory

class MachineCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MachineCategory
        fields = ['id', 'name']
