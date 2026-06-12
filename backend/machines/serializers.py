from rest_framework import serializers
from machines.models import MachineCategory, Machine, Set

class MachineCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MachineCategory
        fields = ['id', 'name']

class MachineSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    class Meta:
        model = Machine
        fields = ['id', 'category', 'category_name', 'name']

class SetSerializer(serializers.ModelSerializer):
    machine_name = serializers.ReadOnlyField(source='machine.name')
    category_name = serializers.ReadOnlyField(source='machine.category.name')
    class Meta:
        model = Set
        fields = ['id', 'machine', 'machine_name', 'category_name', 'name']
