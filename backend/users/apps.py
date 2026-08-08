from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'

    def ready(self):
        import users.signals
        import users.schema

        # Sanity check for writable backup and temporary upload directories
        import os
        import logging
        from django.conf import settings

        logger = logging.getLogger(__name__)
        check_paths = {
            'Backups': '/backups',
            'Temporary upload': os.path.join(settings.BASE_DIR, 'tmp')
        }
        for name, path in check_paths.items():
            if os.path.exists(path):
                if not os.access(path, os.W_OK):
                    logger.error(
                        "SECURITY/PERMISSION ERROR: The %s directory at '%s' is not writable! "
                        "Please verify container volume mount ownership (UID: 999 dmsuser).",
                        name, path
                    )
            else:
                try:
                    os.makedirs(path, exist_ok=True)
                except Exception as e:
                    logger.error(
                        "SECURITY/PERMISSION ERROR: Could not create %s directory at '%s': %s. "
                        "Please verify permissions of parent directory.",
                        name, path, e
                    )
