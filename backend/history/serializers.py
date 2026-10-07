from rest_framework import serializers
from history.models import DieHistory, PrintRecord

class AuditDieHistorySerializer(serializers.ModelSerializer):
    die_id = serializers.CharField(source='die.die_id', read_only=True)
    changed_by_username = serializers.CharField(source='changed_by.username', read_only=True, allow_null=True)

    class Meta:
        model = DieHistory
        fields = [
            'id', 'die', 'die_id', 'changed_by', 'changed_by_username', 
            'timestamp', 'field_name', 'old_value', 'new_value', 'ip_address', 'note'
        ]


class DashboardDieHistorySerializer(serializers.ModelSerializer):
    die_id = serializers.CharField(source='die.die_id', read_only=True)
    changed_by_username = serializers.CharField(source='changed_by.username', read_only=True, allow_null=True)

    class Meta:
        model = DieHistory
        fields = [
            'id', 'die_id', 'changed_by_username', 
            'timestamp', 'field_name', 'old_value', 'new_value'
        ]


class AuditMachineHistorySerializer(serializers.ModelSerializer):
    changed_by_username = serializers.CharField(source='changed_by.username', read_only=True, allow_null=True)

    class Meta:
        from history.models import MachineHistory
        model = MachineHistory
        fields = [
            'id', 'entity_type', 'entity_id', 'entity_name', 'action', 
            'field_name', 'old_value', 'new_value', 'changed_by', 
            'changed_by_username', 'timestamp', 'ip_address'
        ]


class PrintRecordSerializer(serializers.ModelSerializer):
    doc_ref = serializers.CharField(max_length=64, required=False, allow_blank=True)
    work_order = serializers.CharField(max_length=100, required=False, allow_blank=True)

    class Meta:
        model = PrintRecord
        fields = [
            'id',
            'doc_type',
            'doc_ref',
            'work_order',
            'machine_name',
            'material_profile',
            'quality_status',
            'notes',
            'inlet_size',
            'finish_size',
            'total_passes',
            'overall_reduction',
            'avg_elongation',
            'dies',
            'passes_data',
            'printed_by',
            'username',
            'user_role',
            'ip_address',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'printed_by',
            'username',
            'user_role',
            'ip_address',
            'created_at',
        ]
