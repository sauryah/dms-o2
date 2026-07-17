from django.contrib import admin
from history.models import DieHistory, MachineHistory

@admin.register(DieHistory)
class DieHistoryAdmin(admin.ModelAdmin):
    list_display  = ['die', 'field_name', 'old_value', 'new_value', 'changed_by', 'timestamp']
    list_filter   = ['field_name']
    search_fields = ['die__die_id']
    readonly_fields = ['die', 'field_name', 'old_value', 'new_value', 'changed_by', 'timestamp']

@admin.register(MachineHistory)
class MachineHistoryAdmin(admin.ModelAdmin):
    list_display  = ['entity_type', 'entity_name', 'action', 'field_name', 'changed_by', 'timestamp']
    list_filter   = ['entity_type', 'action']
    search_fields = ['entity_name']
    readonly_fields = ['entity_type', 'entity_id', 'entity_name', 'action', 'field_name', 'old_value', 'new_value', 'changed_by', 'timestamp', 'ip_address']
