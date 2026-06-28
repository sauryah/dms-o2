from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.db import transaction
from dies.models import Die, RoundDie, FlatDie
from history.models import DieHistory
from users.middleware import get_current_user, get_current_ip
from dies.services.search_service import SearchService

DIE_WATCH_FIELDS = ['status', 'current_set_id', 'location', 'remarks']

def _get_change_context():
    user = get_current_user()
    return {
        'changed_by': user if (user and user.is_authenticated) else None,
        'ip_address': get_current_ip(),
    }

@receiver(pre_save, sender=Die)
def log_die_changes(sender, instance, **kwargs):
    if instance.rack and instance.shelf is not None:
        instance.location = f"{instance.rack.name} - Shelf {instance.shelf}"

    if not instance.pk:
        return
    old_values = Die.objects.filter(pk=instance.pk).values(*DIE_WATCH_FIELDS).first()
    if not old_values:
        return

    ctx = _get_change_context()

    for field in DIE_WATCH_FIELDS:
        old_val = old_values.get(field)
        new_val = getattr(instance, field)

        old_str = str(old_val) if old_val is not None else ''
        new_str = str(new_val) if new_val is not None else ''

        if old_str != new_str:
            DieHistory.objects.create(
                die=instance,
                field_name=field,
                old_value=old_str,
                new_value=new_str,
                **ctx,
            )


@receiver(pre_save, sender=RoundDie)
def log_round_size_change(sender, instance, **kwargs):
    if not instance.pk:
        return
    old_size = RoundDie.objects.filter(pk=instance.pk).values_list('current_size', flat=True).first()
    if old_size is None:
        return

    if old_size != instance.current_size:
        DieHistory.objects.create(
            die=instance.die,
            field_name='current_size',
            old_value=str(old_size),
            new_value=str(instance.current_size),
            **_get_change_context(),
        )


@receiver(pre_save, sender=FlatDie)
def log_flat_changes(sender, instance, **kwargs):
    if not instance.pk:
        return
    old_values = FlatDie.objects.filter(pk=instance.pk).values('current_width', 'current_thickness').first()
    if not old_values:
        return

    ctx = _get_change_context()

    for field in ['current_width', 'current_thickness']:
        old_val = old_values.get(field)
        new_val = getattr(instance, field)
        if old_val != new_val:
            DieHistory.objects.create(
                die=instance.die,
                field_name=field,
                old_value=str(old_val),
                new_value=str(new_val),
                **ctx,
            )


def _sync_die_from_related(instance):
    die = instance if isinstance(instance, Die) else instance.die
    SearchService.queue_die_sync(die.id)
    SearchService.queue_die_broadcast(die.die_id, 'save')


@receiver(post_save, sender=Die)
def sync_die_post_save(sender, instance, **kwargs):
    _sync_die_from_related(instance)

@receiver(post_save, sender=RoundDie)
def sync_round_die_post_save(sender, instance, **kwargs):
    _sync_die_from_related(instance)

@receiver(post_save, sender=FlatDie)
def sync_flat_die_post_save(sender, instance, **kwargs):
    _sync_die_from_related(instance)


@receiver(post_delete, sender=Die)
def delete_die_post_delete(sender, instance, **kwargs):
    SearchService.delete_die_document(instance.id)
    SearchService.broadcast_die_delete(instance.die_id)
