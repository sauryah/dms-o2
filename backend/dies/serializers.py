from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from django.db import transaction
from dies.contracts import DIE_STATUSES
from dies.models import Die, RoundDie, FlatDie, ImportLog, MaintenanceLog
from history.models import DieHistory

class DieHistorySerializer(serializers.ModelSerializer):
    changed_by_username = serializers.SerializerMethodField()
    
    class Meta:
        model = DieHistory
        fields = ['timestamp', 'field_name', 'old_value', 'new_value', 'changed_by_username', 'ip_address', 'note']
        
    @extend_schema_field(serializers.CharField)
    def get_changed_by_username(self, obj):
        return obj.changed_by.username if obj.changed_by else ''

class DieListSerializer(serializers.ModelSerializer):
    set_name = serializers.SerializerMethodField()
    machine_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Die
        fields = ['die_id', 'die_type', 'casing', 'status', 'location', 'set_name', 'machine_name', 'current_set', 'rack', 'shelf']
        
    @extend_schema_field(serializers.CharField)
    def get_set_name(self, obj):
        return obj.current_set.name if obj.current_set else ''
        
    @extend_schema_field(serializers.CharField)
    def get_machine_name(self, obj):
        return obj.current_set.machine.name if obj.current_set and obj.current_set.machine else ''

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['rack_id'] = instance.rack_id
        rep['rack_name'] = instance.rack.name if instance.rack else ''
        if instance.die_type == 'ROUND' and hasattr(instance, 'rounddie') and instance.rounddie:
            rep['current_size'] = str(instance.rounddie.current_size)
        elif instance.die_type == 'FLAT' and hasattr(instance, 'flatdie') and instance.flatdie:
            rep['current_width'] = str(instance.flatdie.current_width)
            rep['current_thickness'] = str(instance.flatdie.current_thickness)
            rep['radius'] = str(instance.flatdie.radius)
        return rep

class DieDetailSerializer(serializers.ModelSerializer):
    set_name = serializers.SerializerMethodField()
    machine_name = serializers.SerializerMethodField()
    history = DieHistorySerializer(many=True, read_only=True)
    
    class Meta:
        model = Die
        fields = ['die_id', 'die_type', 'casing', 'status', 'location', 'set_name', 'machine_name', 'remarks', 'created_at', 'updated_at', 'history', 'current_set', 'rack', 'shelf']
        
    @extend_schema_field(serializers.CharField)
    def get_set_name(self, obj):
        return obj.current_set.name if obj.current_set else ''
        
    @extend_schema_field(serializers.CharField)
    def get_machine_name(self, obj):
        return obj.current_set.machine.name if obj.current_set and obj.current_set.machine else ''
        
    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['rack_id'] = instance.rack_id
        rep['rack_name'] = instance.rack.name if instance.rack else ''
        if instance.die_type == 'ROUND' and hasattr(instance, 'rounddie') and instance.rounddie:
            rep['punched_size'] = str(instance.rounddie.punched_size)
            rep['current_size'] = str(instance.rounddie.current_size)
        elif instance.die_type == 'FLAT' and hasattr(instance, 'flatdie') and instance.flatdie:
            rep['punched_width'] = str(instance.flatdie.punched_width)
            rep['current_width'] = str(instance.flatdie.current_width)
            rep['punched_thickness'] = str(instance.flatdie.punched_thickness)
            rep['current_thickness'] = str(instance.flatdie.current_thickness)
            rep['radius'] = str(instance.flatdie.radius)
        return rep

class DieCreateSerializer(serializers.ModelSerializer):
    punched_size = serializers.DecimalField(max_digits=7, decimal_places=3, required=False)
    current_size = serializers.DecimalField(max_digits=7, decimal_places=3, required=False)
    
    punched_width = serializers.DecimalField(max_digits=7, decimal_places=3, required=False)
    current_width = serializers.DecimalField(max_digits=7, decimal_places=3, required=False)
    punched_thickness = serializers.DecimalField(max_digits=7, decimal_places=3, required=False)
    current_thickness = serializers.DecimalField(max_digits=7, decimal_places=3, required=False)
    radius = serializers.DecimalField(max_digits=7, decimal_places=3, required=False)
    
    class Meta:
        model = Die
        fields = ['die_id', 'die_type', 'casing', 'status', 'location', 'current_set', 'remarks', 'rack', 'shelf',
                  'punched_size', 'current_size', 'punched_width', 'current_width',
                  'punched_thickness', 'current_thickness', 'radius']
                  
    def to_internal_value(self, data):
        if 'status' in data and data['status']:
            if hasattr(data, 'copy'):
                data = data.copy()
            status_val = str(data['status']).strip().upper()
            if status_val not in DIE_STATUSES:
                raise serializers.ValidationError({"status": f"Invalid status '{status_val}'."})
            data['status'] = status_val
        return super().to_internal_value(data)

    def validate(self, attrs):
        die_type = attrs.get('die_type')
        if die_type == 'ROUND':
            if 'punched_size' not in attrs or 'current_size' not in attrs:
                raise serializers.ValidationError("ROUND die requires punched_size and current_size.")
        elif die_type == 'FLAT':
            if any(k not in attrs for k in ['punched_width', 'current_width', 'punched_thickness', 'current_thickness', 'radius']):
                raise serializers.ValidationError("FLAT die requires punched_width, current_width, punched_thickness, current_thickness, and radius.")
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        die_type = validated_data.get('die_type')
        
        punched_size = validated_data.pop('punched_size', None)
        current_size = validated_data.pop('current_size', None)
        punched_width = validated_data.pop('punched_width', None)
        current_width = validated_data.pop('current_width', None)
        punched_thickness = validated_data.pop('punched_thickness', None)
        current_thickness = validated_data.pop('current_thickness', None)
        radius = validated_data.pop('radius', None)
        
        die = Die.objects.create(**validated_data)
        
        if die_type == 'ROUND':
            RoundDie.objects.create(
                die=die,
                punched_size=punched_size,
                current_size=current_size
            )
        elif die_type == 'FLAT':
            FlatDie.objects.create(
                die=die,
                punched_width=punched_width,
                current_width=current_width,
                punched_thickness=punched_thickness,
                current_thickness=current_thickness,
                radius=radius
            )
        return die

    @transaction.atomic
    def update(self, instance, validated_data):
        punched_size = validated_data.pop('punched_size', None)
        current_size = validated_data.pop('current_size', None)
        punched_width = validated_data.pop('punched_width', None)
        current_width = validated_data.pop('current_width', None)
        punched_thickness = validated_data.pop('punched_thickness', None)
        current_thickness = validated_data.pop('current_thickness', None)
        radius = validated_data.pop('radius', None)
        
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        
        if instance.die_type == 'ROUND':
            if hasattr(instance, 'rounddie') and instance.rounddie:
                rd = instance.rounddie
                if punched_size is not None: rd.punched_size = punched_size
                if current_size is not None: rd.current_size = current_size
                rd.save()
        elif instance.die_type == 'FLAT':
            if hasattr(instance, 'flatdie') and instance.flatdie:
                fd = instance.flatdie
                if punched_width is not None: fd.punched_width = punched_width
                if current_width is not None: fd.current_width = current_width
                if punched_thickness is not None: fd.punched_thickness = punched_thickness
                if current_thickness is not None: fd.current_thickness = current_thickness
                if radius is not None: fd.radius = radius
                fd.save()
        return instance

def serialize_die_list_fast(dies_queryset):
    """
    High-performance serialization function for lists of Die instances.
    Bypasses Django REST Framework's serialization overhead, resulting in 10-15x faster runs.
    """
    data = []
    for die in dies_queryset:
        rep = {
            'die_id': die.die_id,
            'die_type': die.die_type,
            'casing': die.casing,
            'status': die.status,
            'location': die.location,
            'set_name': die.current_set.name if die.current_set else '',
            'machine_name': die.current_set.machine.name if (die.current_set and die.current_set.machine) else '',
            'current_set': die.current_set_id,
            'rack': die.rack_id,
            'rack_id': die.rack_id,
            'rack_name': die.rack.name if die.rack else '',
            'shelf': die.shelf,
        }
        if die.die_type == 'ROUND':
            rd = getattr(die, 'rounddie', None)
            if rd:
                rep['current_size'] = str(rd.current_size)
        elif die.die_type == 'FLAT':
            fd = getattr(die, 'flatdie', None)
            if fd:
                rep['current_width'] = str(fd.current_width)
                rep['current_thickness'] = str(fd.current_thickness)
                rep['radius'] = str(fd.radius)
        data.append(rep)
    return data


class MaintenanceLogSerializer(serializers.ModelSerializer):
    created_by_username = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceLog
        fields = ['id', 'die', 'created_by', 'created_by_username', 'created_at', 'note', 'category']
        read_only_fields = ['id', 'die', 'created_by', 'created_by_username', 'created_at']

    @extend_schema_field(serializers.CharField)
    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else ''


class ImportLogSerializer(serializers.ModelSerializer):
    imported_by_username = serializers.SerializerMethodField()

    class Meta:
        model = ImportLog
        fields = ['id', 'imported_by', 'imported_by_username', 'imported_at', 'filename', 
                  'created_count', 'updated_count', 'skipped_count', 'error_count', 'errors_json']

    @extend_schema_field(serializers.CharField)
    def get_imported_by_username(self, obj):
        return obj.imported_by.username if obj.imported_by else ''
