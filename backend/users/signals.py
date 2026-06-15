from django.db.models.signals import pre_save
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
