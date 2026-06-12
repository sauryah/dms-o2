from django.contrib import admin
from history.models import DieHistory

@admin.register(DieHistory)
class DieHistoryAdmin(admin.ModelAdmin):
    list_display  = ['die', 'field_name', 'old_value', 'new_value', 'changed_by', 'timestamp']
    list_filter   = ['field_name']
    search_fields = ['die__die_id']
    readonly_fields = ['die', 'field_name', 'old_value', 'new_value', 'changed_by', 'timestamp']
