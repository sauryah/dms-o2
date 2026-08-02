from django.contrib import admin
from machines.models import MachineCategory, Machine, Set, Rack

class MachineInline(admin.TabularInline):
    model = Machine
    extra = 1
    show_change_link = True

@admin.register(MachineCategory)
class MachineCategoryAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']
    inlines = [MachineInline]

class SetInline(admin.TabularInline):
    model = Set
    extra = 1
    show_change_link = True

@admin.register(Machine)
class MachineAdmin(admin.ModelAdmin):
    list_display = ['name', 'category']
    list_filter = ['category']
    search_fields = ['name']
    inlines = [SetInline]

@admin.register(Set)
class SetAdmin(admin.ModelAdmin):
    list_display = ['name', 'machine']
    list_filter = ['machine']
    search_fields = ['name', 'machine__name']

@admin.register(Rack)
class RackAdmin(admin.ModelAdmin):
    list_display = ['name', 'row_count', 'column_count']
    search_fields = ['name']
