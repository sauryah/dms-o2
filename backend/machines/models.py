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

    class Meta:
        unique_together = ['machine', 'name']

    def __str__(self):
        return f"{self.machine.name} - {self.name}"
