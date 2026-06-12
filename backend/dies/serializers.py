from rest_framework import serializers
from dies.models import Die, RoundDie, FlatDie
from history.models import DieHistory

class DieHistorySerializer(serializers.ModelSerializer):
    changed_by_username = serializers.SerializerMethodField()
    
    class Meta:
        model = DieHistory
        fields = ['timestamp', 'field_name', 'old_value', 'new_value', 'changed_by_username', 'note']
        
    def get_changed_by_username(self, obj):
        return obj.changed_by.username if obj.changed_by else ''

class DieListSerializer(serializers.ModelSerializer):
    set_name = serializers.SerializerMethodField()
    machine_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Die
        fields = ['die_id', 'die_type', 'casing', 'status', 'location', 'set_name', 'machine_name']
        
    def get_set_name(self, obj):
        return obj.current_set.name if obj.current_set else ''
        
    def get_machine_name(self, obj):
        return obj.current_set.machine.name if obj.current_set and obj.current_set.machine else ''

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if instance.die_type == 'ROUND' and hasattr(instance, 'rounddie') and instance.rounddie:
            rep['current_size'] = str(instance.rounddie.current_size)
        elif instance.die_type == 'FLAT' and hasattr(instance, 'flatdie') and instance.flatdie:
            rep['current_width'] = str(instance.flatdie.current_width)
            rep['current_thickness'] = str(instance.flatdie.current_thickness)
        return rep

class DieDetailSerializer(serializers.ModelSerializer):
    set_name = serializers.SerializerMethodField()
    machine_name = serializers.SerializerMethodField()
    history = DieHistorySerializer(many=True, read_only=True)
    
    class Meta:
        model = Die
        fields = ['die_id', 'die_type', 'casing', 'status', 'location', 'set_name', 'machine_name', 'remarks', 'created_at', 'updated_at', 'history', 'current_set']
        
    def get_set_name(self, obj):
        return obj.current_set.name if obj.current_set else ''
        
    def get_machine_name(self, obj):
        return obj.current_set.machine.name if obj.current_set and obj.current_set.machine else ''
        
    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if instance.die_type == 'ROUND' and hasattr(instance, 'rounddie') and instance.rounddie:
            rep['original_size'] = str(instance.rounddie.original_size)
            rep['current_size'] = str(instance.rounddie.current_size)
        elif instance.die_type == 'FLAT' and hasattr(instance, 'flatdie') and instance.flatdie:
            rep['original_width'] = str(instance.flatdie.original_width)
            rep['current_width'] = str(instance.flatdie.current_width)
            rep['original_thickness'] = str(instance.flatdie.original_thickness)
            rep['current_thickness'] = str(instance.flatdie.current_thickness)
            rep['radius'] = str(instance.flatdie.radius)
        return rep

class DieCreateSerializer(serializers.ModelSerializer):
    original_size = serializers.DecimalField(max_digits=7, decimal_places=3, required=False)
    current_size = serializers.DecimalField(max_digits=7, decimal_places=3, required=False)
    
    original_width = serializers.DecimalField(max_digits=7, decimal_places=3, required=False)
    current_width = serializers.DecimalField(max_digits=7, decimal_places=3, required=False)
    original_thickness = serializers.DecimalField(max_digits=7, decimal_places=3, required=False)
    current_thickness = serializers.DecimalField(max_digits=7, decimal_places=3, required=False)
    radius = serializers.DecimalField(max_digits=7, decimal_places=3, required=False)
    
    class Meta:
        model = Die
        fields = ['die_id', 'die_type', 'casing', 'status', 'location', 'current_set', 'remarks',
                  'original_size', 'current_size', 'original_width', 'current_width',
                  'original_thickness', 'current_thickness', 'radius']
                  
    def validate(self, attrs):
        die_type = attrs.get('die_type')
        if die_type == 'ROUND':
            if 'original_size' not in attrs or 'current_size' not in attrs:
                raise serializers.ValidationError("ROUND die requires original_size and current_size.")
        elif die_type == 'FLAT':
            if any(k not in attrs for k in ['original_width', 'current_width', 'original_thickness', 'current_thickness', 'radius']):
                raise serializers.ValidationError("FLAT die requires original_width, current_width, original_thickness, current_thickness, and radius.")
        return attrs

    def create(self, validated_data):
        die_type = validated_data.get('die_type')
        
        original_size = validated_data.pop('original_size', None)
        current_size = validated_data.pop('current_size', None)
        original_width = validated_data.pop('original_width', None)
        current_width = validated_data.pop('current_width', None)
        original_thickness = validated_data.pop('original_thickness', None)
        current_thickness = validated_data.pop('current_thickness', None)
        radius = validated_data.pop('radius', None)
        
        die = Die.objects.create(**validated_data)
        
        if die_type == 'ROUND':
            RoundDie.objects.create(
                die=die,
                original_size=original_size,
                current_size=current_size
            )
        elif die_type == 'FLAT':
            FlatDie.objects.create(
                die=die,
                original_width=original_width,
                current_width=current_width,
                original_thickness=original_thickness,
                current_thickness=current_thickness,
                radius=radius
            )
        return die

    def update(self, instance, validated_data):
        original_size = validated_data.pop('original_size', None)
        current_size = validated_data.pop('current_size', None)
        original_width = validated_data.pop('original_width', None)
        current_width = validated_data.pop('current_width', None)
        original_thickness = validated_data.pop('original_thickness', None)
        current_thickness = validated_data.pop('current_thickness', None)
        radius = validated_data.pop('radius', None)
        
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        
        if instance.die_type == 'ROUND':
            if hasattr(instance, 'rounddie') and instance.rounddie:
                rd = instance.rounddie
                if original_size is not None: rd.original_size = original_size
                if current_size is not None: rd.current_size = current_size
                rd.save()
        elif instance.die_type == 'FLAT':
            if hasattr(instance, 'flatdie') and instance.flatdie:
                fd = instance.flatdie
                if original_width is not None: fd.original_width = original_width
                if current_width is not None: fd.current_width = current_width
                if original_thickness is not None: fd.original_thickness = original_thickness
                if current_thickness is not None: fd.current_thickness = current_thickness
                if radius is not None: fd.radius = radius
                fd.save()
        return instance
