from rest_framework import serializers
from machines.models import Rack

class RackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rack
        fields = ['id', 'name', 'row_count', 'column_count']
