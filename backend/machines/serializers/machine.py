from rest_framework import serializers
from machines.models import Machine

class MachineSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    class Meta:
        model = Machine
        fields = ['id', 'category', 'category_name', 'name']
