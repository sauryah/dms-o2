from django.db import models

class MachineCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class Machine(models.Model):
    category = models.ForeignKey(MachineCategory, on_delete=models.PROTECT)
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class Set(models.Model):
    machine = models.ForeignKey(Machine, on_delete=models.PROTECT)
    name = models.CharField(max_length=100)
    order = models.IntegerField(default=0)

    class Meta:
        unique_together = ['machine', 'name']
        ordering = ['order', 'name']

    def __str__(self):
        return f"{self.machine.name} - {self.name}"

class Rack(models.Model):
    name = models.CharField(max_length=50, unique=True)
    row_count = models.IntegerField()
    column_count = models.IntegerField()

    def __str__(self):
        return self.name
