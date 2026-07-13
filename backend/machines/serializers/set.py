from rest_framework import serializers
from machines.models import Set

class SetSerializer(serializers.ModelSerializer):
    machine_name = serializers.ReadOnlyField(source='machine.name')
    category_name = serializers.ReadOnlyField(source='machine.category.name')
    die_count = serializers.IntegerField(read_only=True, default=0)
    class Meta:
        model = Set
        fields = ['id', 'machine', 'machine_name', 'category_name', 'name', 'die_count', 'order']
