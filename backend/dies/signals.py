from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.db import transaction
from dies.models import Die, RoundDie, FlatDie
from history.models import DieHistory
from users.middleware import get_current_user, get_current_ip
from search.meili import sync_die, delete_die_document
from dms.events import broadcast_event

# Watch these fields on Die
DIE_WATCH_FIELDS = ['status', 'current_set_id', 'location', 'remarks']

@receiver(pre_save, sender=Die)
def log_die_changes(sender, instance, **kwargs):
    if not instance.pk:
        return  # new die — no history yet
    try:
        old = Die.objects.get(pk=instance.pk)
    except Die.DoesNotExist:
        return
    
    user = get_current_user()
    changed_by = user if (user and user.is_authenticated) else None
    ip = get_current_ip()
 
    for field in DIE_WATCH_FIELDS:
        old_val = getattr(old, field)
        new_val = getattr(instance, field)
        if str(old_val) != str(new_val):
            DieHistory.objects.create(
                die=instance,
                changed_by=changed_by,
                field_name=field,
                old_value=str(old_val) if old_val is not None else '',
                new_value=str(new_val) if new_val is not None else '',
                ip_address=ip,
            )

@receiver(pre_save, sender=RoundDie)
def log_round_size_change(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old = RoundDie.objects.get(pk=instance.pk)
    except RoundDie.DoesNotExist:
        return
    
    user = get_current_user()
    changed_by = user if (user and user.is_authenticated) else None
    ip = get_current_ip()

    if old.current_size != instance.current_size:
        DieHistory.objects.create(
            die=instance.die,
            changed_by=changed_by,
            field_name='current_size',
            old_value=str(old.current_size),
            new_value=str(instance.current_size),
            ip_address=ip,
        )

@receiver(pre_save, sender=FlatDie)
def log_flat_changes(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old = FlatDie.objects.get(pk=instance.pk)
    except FlatDie.DoesNotExist:
        return
    
    user = get_current_user()
    changed_by = user if (user and user.is_authenticated) else None
    ip = get_current_ip()

    for field in ['current_width', 'current_thickness']:
        old_val = getattr(old, field)
        new_val = getattr(instance, field)
        if old_val != new_val:
            DieHistory.objects.create(
                die=instance.die,
                changed_by=changed_by,
                field_name=field,
                old_value=str(old_val),
                new_value=str(new_val),
                ip_address=ip,
            )

@receiver(post_save, sender=Die)
def sync_die_post_save(sender, instance, **kwargs):
    transaction.on_commit(lambda: sync_die(instance))
    transaction.on_commit(lambda: broadcast_event('die_update', {'id': instance.die_id, 'action': 'save'}))

@receiver(post_save, sender=RoundDie)
def sync_round_die_post_save(sender, instance, **kwargs):
    transaction.on_commit(lambda: sync_die(instance.die))
    transaction.on_commit(lambda: broadcast_event('die_update', {'id': instance.die.die_id, 'action': 'save'}))

@receiver(post_save, sender=FlatDie)
def sync_flat_die_post_save(sender, instance, **kwargs):
    transaction.on_commit(lambda: sync_die(instance.die))
    transaction.on_commit(lambda: broadcast_event('die_update', {'id': instance.die.die_id, 'action': 'save'}))

@receiver(post_delete, sender=Die)
def delete_die_post_delete(sender, instance, **kwargs):
    transaction.on_commit(lambda: delete_die_document(instance.die_id))
    transaction.on_commit(lambda: broadcast_event('die_update', {'id': instance.die_id, 'action': 'delete'}))

