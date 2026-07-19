from django.db.models.signals import pre_save, post_save, post_delete, pre_delete
from django.dispatch import receiver
from django.db import transaction
from machines.models import Set, Machine, MachineCategory, Rack
from dies.models import Die
from history.models import MachineHistory
from users.middleware import get_current_user, get_current_ip
from dms.events import broadcast_event
from dies.contracts import (
    MACHINE_DELETE_ACTION,
    MACHINE_SAVE_ACTION,
    MACHINE_UPDATE_EVENT,
    SET_DELETE_ACTION,
    SET_SAVE_ACTION,
    SET_UPDATE_EVENT,
)

@receiver(post_save, sender=Set)
def sync_set_dies(sender, instance, **kwargs):
    # Resync all dies that belong to this set
    def resync():
        die_ids = list(Die.objects.filter(current_set=instance).values_list('id', flat=True))
        if die_ids:
            from search.tasks import sync_dies_batch_task
            sync_dies_batch_task.delay(die_ids)
    transaction.on_commit(resync)
    transaction.on_commit(lambda: broadcast_event(SET_UPDATE_EVENT, {'id': instance.id, 'action': SET_SAVE_ACTION}))

@receiver(post_save, sender=Machine)
def sync_machine_dies(sender, instance, **kwargs):
    # Resync all dies in sets belonging to this machine
    def resync():
        die_ids = list(Die.objects.filter(current_set__machine=instance).values_list('id', flat=True))
        if die_ids:
            from search.tasks import sync_dies_batch_task
            sync_dies_batch_task.delay(die_ids)
    transaction.on_commit(resync)
    transaction.on_commit(lambda: broadcast_event(MACHINE_UPDATE_EVENT, {'id': instance.id, 'action': MACHINE_SAVE_ACTION}))

@receiver(pre_delete, sender=Set)
def handle_set_deletion(sender, instance, **kwargs):
    # Before the set is deleted, save all its dies with current_set=None
    # to trigger pre_save/post_save signals (for history logs & Meilisearch sync)
    for die in Die.objects.filter(current_set=instance):
        die.current_set = None
        die.save()

@receiver(post_delete, sender=Set)
def delete_set_post_delete(sender, instance, **kwargs):
    transaction.on_commit(lambda: broadcast_event(SET_UPDATE_EVENT, {'id': instance.id, 'action': SET_DELETE_ACTION}))

@receiver(post_delete, sender=Machine)
def delete_machine_post_delete(sender, instance, **kwargs):
    transaction.on_commit(lambda: broadcast_event(MACHINE_UPDATE_EVENT, {'id': instance.id, 'action': MACHINE_DELETE_ACTION}))


# --- MachineHistory Logging Signals ---

@receiver(post_save, sender=MachineCategory)
def log_category_created(sender, instance, created, **kwargs):
    if created:
        user = get_current_user()
        changed_by = user if (user and user.is_authenticated) else None
        ip = get_current_ip()
        MachineHistory.objects.create(
            entity_type='CATEGORY',
            entity_id=instance.id,
            entity_name=instance.name,
            action='CREATED',
            changed_by=changed_by,
            ip_address=ip,
        )

@receiver(pre_save, sender=MachineCategory)
def log_category_updated(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old_obj = MachineCategory.objects.get(pk=instance.pk)
    except MachineCategory.DoesNotExist:
        return
        
    user = get_current_user()
    changed_by = user if (user and user.is_authenticated) else None
    ip = get_current_ip()

    if old_obj.name != instance.name:
        MachineHistory.objects.create(
            entity_type='CATEGORY',
            entity_id=instance.id,
            entity_name=instance.name,
            action='UPDATED',
            field_name='name',
            old_value=old_obj.name,
            new_value=instance.name,
            changed_by=changed_by,
            ip_address=ip,
        )

@receiver(post_delete, sender=MachineCategory)
def log_category_deleted(sender, instance, **kwargs):
    user = get_current_user()
    changed_by = user if (user and user.is_authenticated) else None
    ip = get_current_ip()
    MachineHistory.objects.create(
        entity_type='CATEGORY',
        entity_id=instance.id,
        entity_name=instance.name,
        action='DELETED',
        changed_by=changed_by,
        ip_address=ip,
    )


@receiver(post_save, sender=Machine)
def log_machine_created(sender, instance, created, **kwargs):
    if created:
        user = get_current_user()
        changed_by = user if (user and user.is_authenticated) else None
        ip = get_current_ip()
        MachineHistory.objects.create(
            entity_type='MACHINE',
            entity_id=instance.id,
            entity_name=instance.name,
            action='CREATED',
            changed_by=changed_by,
            ip_address=ip,
        )

@receiver(pre_save, sender=Machine)
def log_machine_updated(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old_obj = Machine.objects.select_related('category').get(pk=instance.pk)
    except Machine.DoesNotExist:
        return
        
    user = get_current_user()
    changed_by = user if (user and user.is_authenticated) else None
    ip = get_current_ip()

    if old_obj.name != instance.name:
        MachineHistory.objects.create(
            entity_type='MACHINE',
            entity_id=instance.id,
            entity_name=instance.name,
            action='UPDATED',
            field_name='name',
            old_value=old_obj.name,
            new_value=instance.name,
            changed_by=changed_by,
            ip_address=ip,
        )

    if old_obj.category_id != instance.category_id:
        MachineHistory.objects.create(
            entity_type='MACHINE',
            entity_id=instance.id,
            entity_name=instance.name,
            action='UPDATED',
            field_name='category',
            old_value=old_obj.category.name if old_obj.category else '',
            new_value=instance.category.name if instance.category else '',
            changed_by=changed_by,
            ip_address=ip,
        )

@receiver(post_delete, sender=Machine)
def log_machine_deleted(sender, instance, **kwargs):
    user = get_current_user()
    changed_by = user if (user and user.is_authenticated) else None
    ip = get_current_ip()
    MachineHistory.objects.create(
        entity_type='MACHINE',
        entity_id=instance.id,
        entity_name=instance.name,
        action='DELETED',
        changed_by=changed_by,
        ip_address=ip,
    )


@receiver(post_save, sender=Set)
def log_set_created(sender, instance, created, **kwargs):
    if created:
        user = get_current_user()
        changed_by = user if (user and user.is_authenticated) else None
        ip = get_current_ip()
        MachineHistory.objects.create(
            entity_type='SET',
            entity_id=instance.id,
            entity_name=instance.name,
            action='CREATED',
            changed_by=changed_by,
            ip_address=ip,
        )

@receiver(pre_save, sender=Set)
def log_set_updated(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old_obj = Set.objects.select_related('machine').get(pk=instance.pk)
    except Set.DoesNotExist:
        return
        
    user = get_current_user()
    changed_by = user if (user and user.is_authenticated) else None
    ip = get_current_ip()

    if old_obj.name != instance.name:
        MachineHistory.objects.create(
            entity_type='SET',
            entity_id=instance.id,
            entity_name=instance.name,
            action='UPDATED',
            field_name='name',
            old_value=old_obj.name,
            new_value=instance.name,
            changed_by=changed_by,
            ip_address=ip,
        )

    if old_obj.machine_id != instance.machine_id:
        MachineHistory.objects.create(
            entity_type='SET',
            entity_id=instance.id,
            entity_name=instance.name,
            action='UPDATED',
            field_name='machine',
            old_value=old_obj.machine.name if old_obj.machine else '',
            new_value=instance.machine.name if instance.machine else '',
            changed_by=changed_by,
            ip_address=ip,
        )

@receiver(post_delete, sender=Set)
def log_set_deleted(sender, instance, **kwargs):
    user = get_current_user()
    changed_by = user if (user and user.is_authenticated) else None
    ip = get_current_ip()
    MachineHistory.objects.create(
        entity_type='SET',
        entity_id=instance.id,
        entity_name=instance.name,
        action='DELETED',
        changed_by=changed_by,
        ip_address=ip,
    )


@receiver(post_save, sender=Rack)
def log_rack_created(sender, instance, created, **kwargs):
    if created:
        user = get_current_user()
        changed_by = user if (user and user.is_authenticated) else None
        ip = get_current_ip()
        MachineHistory.objects.create(
            entity_type='RACK',
            entity_id=instance.id,
            entity_name=instance.name,
            action='CREATED',
            changed_by=changed_by,
            ip_address=ip,
        )


@receiver(pre_save, sender=Rack)
def log_rack_updated(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old_obj = Rack.objects.get(pk=instance.pk)
    except Rack.DoesNotExist:
        return
        
    user = get_current_user()
    changed_by = user if (user and user.is_authenticated) else None
    ip = get_current_ip()

    for field in ['name', 'row_count', 'column_count']:
        old_val = getattr(old_obj, field)
        new_val = getattr(instance, field)
        if old_val != new_val:
            MachineHistory.objects.create(
                entity_type='RACK',
                entity_id=instance.id,
                entity_name=instance.name,
                action='UPDATED',
                field_name=field,
                old_value=str(old_val),
                new_value=str(new_val),
                changed_by=changed_by,
                ip_address=ip,
            )


@receiver(post_delete, sender=Rack)
def log_rack_deleted(sender, instance, **kwargs):
    user = get_current_user()
    changed_by = user if (user and user.is_authenticated) else None
    ip = get_current_ip()
    MachineHistory.objects.create(
        entity_type='RACK',
        entity_id=instance.id,
        entity_name=instance.name,
        action='DELETED',
        changed_by=changed_by,
        ip_address=ip,
    )
