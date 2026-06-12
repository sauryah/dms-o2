from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from machines.models import Set, Machine
from dies.models import Die
from search.meili import sync_die

@receiver(post_save, sender=Set)
def sync_set_dies(sender, instance, **kwargs):
    # Resync all dies that belong to this set
    for die in Die.objects.filter(current_set=instance):
        sync_die(die)

@receiver(post_save, sender=Machine)
def sync_machine_dies(sender, instance, **kwargs):
    # Resync all dies in sets belonging to this machine
    for die in Die.objects.filter(current_set__machine=instance):
        sync_die(die)

@receiver(pre_delete, sender=Set)
def handle_set_deletion(sender, instance, **kwargs):
    # Before the set is deleted, save all its dies with current_set=None
    # to trigger pre_save/post_save signals (for history logs & Meilisearch sync)
    for die in Die.objects.filter(current_set=instance):
        die.current_set = None
        die.save()
