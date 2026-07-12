from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.db import transaction
from dies.models import Die, RoundDie, FlatDie
from history.models import DieHistory
from users.middleware import get_current_user, get_current_ip, _thread_locals
from dies.services.search_service import SearchService
from dies.contracts import DIE_SAVE_ACTION

DIE_WATCH_FIELDS = ['status', 'current_set_id', 'location', 'remarks', 'die_id', 'casing']

def _get_change_context():
    user = get_current_user()
    return {
        'changed_by': user if (user and user.is_authenticated) else None,
        'ip_address': get_current_ip(),
    }

@receiver(pre_save, sender=Die)
def log_die_changes(sender, instance, **kwargs):
    # 1. If rack and shelf are explicitly set, regenerate location from them
    if instance.rack and instance.shelf is not None:
        instance.location = f"{instance.rack.name} - Shelf {instance.shelf}"
    # 2. If rack/shelf are not set, but a location string is provided, parse it
    elif instance.location:
        loc_str = instance.location.strip()
        if loc_str.lower() in ('', 'general', 'none', 'unassigned'):
            instance.rack = None
            instance.shelf = None
            instance.location = ''
        else:
            import re
            from machines.models import Rack
            match = re.match(r'Rack\s+([A-Za-z0-9]+)\s*-\s*Shelf\s*([0-9]+)', loc_str, re.IGNORECASE)
            if match:
                rack_name = match.group(1).strip()
                shelf_num = int(match.group(2))
                try:
                    rack = Rack.objects.filter(name__iexact=rack_name).first()
                    if rack:
                        instance.rack = rack
                        instance.shelf = shelf_num
                        instance.location = f"{rack.name} - Shelf {shelf_num}"
                except Exception:
                    pass
    # 3. Otherwise, if both are empty/null, clear everything
    else:
        instance.rack = None
        instance.shelf = None
        instance.location = ''

    if not instance.pk:
        return
    if getattr(_thread_locals, 'skip_single_sync', False):
        return
    old_values = Die.objects.filter(pk=instance.pk).values(*DIE_WATCH_FIELDS).first()
    if not old_values:
        return

    ctx = _get_change_context()

    for field in DIE_WATCH_FIELDS:
        old_val = old_values.get(field)
        new_val = getattr(instance, field)

        if field == 'current_set_id':
            from machines.models import Set
            old_set_name = ''
            new_set_name = ''
            if old_val:
                try:
                    old_set_name = Set.objects.filter(pk=old_val).values_list('name', flat=True).first() or ''
                except Exception:
                    old_set_name = str(old_val)
            if new_val:
                try:
                    new_set_name = Set.objects.filter(pk=new_val).values_list('name', flat=True).first() or ''
                except Exception:
                    new_set_name = str(new_val)
            old_str = old_set_name
            new_str = new_set_name
        else:
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
    if getattr(_thread_locals, 'skip_single_sync', False):
        return
    old_vals = RoundDie.objects.filter(pk=instance.pk).values('current_size', 'punched_size').first()
    if not old_vals:
        return

    ctx = _get_change_context()
    for field in ['current_size', 'punched_size']:
        old_val = old_vals.get(field)
        new_val = getattr(instance, field)
        old_str = str(old_val) if old_val is not None else ''
        new_str = str(new_val) if new_val is not None else ''
        if old_str != new_str:
            DieHistory.objects.create(
                die=instance.die,
                field_name=field,
                old_value=old_str,
                new_value=new_str,
                **ctx,
            )


@receiver(pre_save, sender=FlatDie)
def log_flat_changes(sender, instance, **kwargs):
    if not instance.pk:
        return
    if getattr(_thread_locals, 'skip_single_sync', False):
        return
    old_values = FlatDie.objects.filter(pk=instance.pk).values('current_width', 'current_thickness', 'punched_width', 'punched_thickness', 'radius').first()
    if not old_values:
      return

    ctx = _get_change_context()

    for field in ['current_width', 'current_thickness', 'punched_width', 'punched_thickness', 'radius']:
        old_val = old_values.get(field)
        new_val = getattr(instance, field)
        old_str = str(old_val) if old_val is not None else ''
        new_str = str(new_val) if new_val is not None else ''
        if old_str != new_str:
            DieHistory.objects.create(
                die=instance.die,
                field_name=field,
                old_value=old_str,
                new_value=new_str,
                **ctx,
            )


def _sync_die_from_related(instance):
    die = instance if isinstance(instance, Die) else instance.die
    SearchService.queue_die_sync(die.id)
    SearchService.queue_die_broadcast(die.die_id, DIE_SAVE_ACTION)


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
