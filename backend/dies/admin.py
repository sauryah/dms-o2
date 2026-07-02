from django.contrib import admin
from dies.models import Die, RoundDie, FlatDie

@admin.register(Die)
class DieAdmin(admin.ModelAdmin):
    list_display   = ['die_id', 'die_type', 'casing', 'status', 'location', 'current_set', 'updated_at']
    list_filter    = ['die_type', 'status', 'casing']
    search_fields  = ['die_id', 'casing', 'location', 'remarks']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(RoundDie)
class RoundDieAdmin(admin.ModelAdmin):
    list_display  = ['die', 'punched_size', 'current_size']
    search_fields = ['die__die_id']

@admin.register(FlatDie)
class FlatDieAdmin(admin.ModelAdmin):
    list_display  = ['die', 'punched_width', 'current_width', 'punched_thickness', 'current_thickness']
    search_fields = ['die__die_id']
