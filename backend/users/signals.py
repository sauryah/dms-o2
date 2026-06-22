from django.db.models.signals import pre_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from users.models import UserSession

User = get_user_model()

@receiver(pre_save, sender=User)
def evict_sessions_on_security_changes(sender, instance, **kwargs):
    """
    Automatically terminates active user sessions if:
    1. The user account is deactivated (is_active goes from True to False).
    2. The user's password is changed.
    """
    if not instance.pk:
        return  # New user registration, no active sessions to evict

    try:
        old_user = User.objects.get(pk=instance.pk)
    except User.DoesNotExist:
        return

    # Check if user was deactivated or password was changed
    deactivated = old_user.is_active and not instance.is_active
    password_changed = old_user.password != instance.password

    if deactivated or password_changed:
        # Delete active session to immediately evict the user
        UserSession.objects.filter(user=instance).delete()


@receiver(post_delete, sender=UserSession)
def evict_redis_cache_on_session_delete(sender, instance, **kwargs):
    """
    Clears the active session key from Redis cache when the UserSession object is deleted.
    """
    from django.core.cache import cache
    cache_key = f"user_session:{instance.user_id}:{instance.token_hash}"
    cache.delete(cache_key)
