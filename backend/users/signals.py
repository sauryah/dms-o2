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
    3. The user's role is changed (e.g. demotion/promotion).
    4. The user's tool authorizations are modified.
    """
    if not instance.pk:
        return  # New user registration, no active sessions to evict

    try:
        old_user = User.objects.get(pk=instance.pk)
    except User.DoesNotExist:
        return

    # Check if user was deactivated, password was changed, or role/permissions were modified
    deactivated = old_user.is_active and not instance.is_active
    password_changed = old_user.password != instance.password
    role_changed = old_user.role != instance.role
    tools_changed = (
        old_user.is_authorized_for_tools != instance.is_authorized_for_tools or
        old_user.authorized_tools != instance.authorized_tools
    )

    if deactivated or password_changed or role_changed or tools_changed:
        # Delete active sessions to immediately evict the user and invalidate privileges
        for session in UserSession.objects.filter(user=instance):
            session.delete()


@receiver(post_delete, sender=UserSession)
def evict_redis_cache_on_session_delete(sender, instance, **kwargs):
    """
    Clears the active session key from Redis cache when the UserSession object is deleted.
    """
    from django.core.cache import cache
    cache_key = f"user_session:{instance.user_id}:{instance.token_hash}"
    cache.delete(cache_key)

    # Direct Redis delete for Go verify_token cache key (to bypass Django prefix)
    try:
        import redis
        from django.conf import settings
        r = redis.Redis.from_url(settings.REDIS_CACHE_URL)
        r.delete(f"verify_token:{instance.token_hash}")
    except Exception:
        pass
