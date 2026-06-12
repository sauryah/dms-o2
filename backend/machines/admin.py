from django.contrib import admin
from machines.models import MachineCategory, Machine, Set

@admin.register(MachineCategory)
class MachineCategoryAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']

@admin.register(Machine)
class MachineAdmin(admin.ModelAdmin):
    list_display = ['name', 'category']
    list_filter = ['category']
    search_fields = ['name']

@admin.register(Set)
class SetAdmin(admin.ModelAdmin):
    list_display = ['name', 'machine']
    list_filter = ['machine']
    search_fields = ['name', 'machine__name']
