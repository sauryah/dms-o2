from rest_framework import serializers
from machines.models import Set

class SetSerializer(serializers.ModelSerializer):
    machine_name = serializers.ReadOnlyField(source='machine.name')
    category_name = serializers.ReadOnlyField(source='machine.category.name')
    class Meta:
        model = Set
        fields = ['id', 'machine', 'machine_name', 'category_name', 'name']
