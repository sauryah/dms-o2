from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.db import transaction
from dies.models import Die, RoundDie, FlatDie
from history.models import DieHistory
from users.middleware import get_current_user, get_current_ip
from dies.services.search_service import SearchService

# Watch these fields on Die
DIE_WATCH_FIELDS = ['status', 'current_set_id', 'location', 'remarks']

@receiver(pre_save, sender=Die)
def log_die_changes(sender, instance, **kwargs):
    if not instance.pk:
        return  # new die — no history yet
    old_values = Die.objects.filter(pk=instance.pk).values('status', 'current_set_id', 'location', 'remarks').first()
    if not old_values:
        return
    
    user = get_current_user()
    changed_by = user if (user and user.is_authenticated) else None
    ip = get_current_ip()
 
    for field in DIE_WATCH_FIELDS:
        old_val = old_values.get(field)
        new_val = getattr(instance, field)
        
        old_str = str(old_val) if old_val is not None else ''
        new_str = str(new_val) if new_val is not None else ''
        
        if old_str != new_str:
            DieHistory.objects.create(
                die=instance,
                changed_by=changed_by,
                field_name=field,
                old_value=old_str,
                new_value=new_str,
                ip_address=ip,
            )

@receiver(pre_save, sender=RoundDie)
def log_round_size_change(sender, instance, **kwargs):
    if not instance.pk:
        return
    old_size = RoundDie.objects.filter(pk=instance.pk).values_list('current_size', flat=True).first()
    if old_size is None:
        return
    
    user = get_current_user()
    changed_by = user if (user and user.is_authenticated) else None
    ip = get_current_ip()

    if old_size != instance.current_size:
        DieHistory.objects.create(
            die=instance.die,
            changed_by=changed_by,
            field_name='current_size',
            old_value=str(old_size),
            new_value=str(instance.current_size),
            ip_address=ip,
        )

@receiver(pre_save, sender=FlatDie)
def log_flat_changes(sender, instance, **kwargs):
    if not instance.pk:
        return
    old_values = FlatDie.objects.filter(pk=instance.pk).values('current_width', 'current_thickness').first()
    if not old_values:
        return
    
    user = get_current_user()
    changed_by = user if (user and user.is_authenticated) else None
    ip = get_current_ip()

    for field in ['current_width', 'current_thickness']:
        old_val = old_values.get(field)
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
    SearchService.queue_die_sync(instance.id)
    SearchService.queue_die_broadcast(instance.die_id, 'save')

@receiver(post_save, sender=RoundDie)
def sync_round_die_post_save(sender, instance, **kwargs):
    SearchService.queue_die_sync(instance.die.id)
    SearchService.queue_die_broadcast(instance.die.die_id, 'save')

@receiver(post_save, sender=FlatDie)
def sync_flat_die_post_save(sender, instance, **kwargs):
    SearchService.queue_die_sync(instance.die.id)
    SearchService.queue_die_broadcast(instance.die.die_id, 'save')

@receiver(post_delete, sender=Die)
def delete_die_post_delete(sender, instance, **kwargs):
    SearchService.delete_die_document(instance.id)
    SearchService.broadcast_die_delete(instance.die_id)

