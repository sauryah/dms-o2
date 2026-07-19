import os
import logging
from celery import shared_task
from celery.utils.log import get_task_logger
from users.services.backup_service import BackupService
from dies.contracts import BACKUP_UPDATE_EVENT, BACKUP_CREATE_ACTION, BACKUP_RESTORE_ACTION
from dms.events import broadcast_event

logger = get_task_logger(__name__)

@shared_task(bind=True, max_retries=3)
def create_backup_task(self):
    """
    Asynchronously execute database backup (pg_dump) using BackupService.
    """
    try:
        logger.info("Starting asynchronous backup creation task...")
        filename = BackupService.create_backup()
        logger.info(f"Asynchronous backup created successfully: {filename}")
        broadcast_event(BACKUP_UPDATE_EVENT, {'action': BACKUP_CREATE_ACTION, 'filename': filename})
        return {'status': 'success', 'filename': filename}
    except Exception as exc:
        logger.error(f"Asynchronous backup failed: {exc}")
        raise self.retry(exc=exc, countdown=10)

@shared_task(bind=True, max_retries=1)
def restore_backup_task(self, filepath, filename, user_id, session_data=None):
    """
    Asynchronously execute database restoration (pg_restore) using BackupService.
    
    Args:
        filepath: Path to the backup file
        filename: Name of the backup file
        user_id: ID of the user performing the restore
        session_data: Dict with 'user_id' and 'token_hash' to preserve session (no raw tokens)
    """
    try:
        logger.info(f"Starting asynchronous restore task for backup: {filename}")
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = None
        if user_id:
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                pass

        BackupService.restore_backup(filepath, filename, user, session_data)
        logger.info(f"Asynchronous restore completed successfully for backup: {filename}")
        return {'status': 'success'}
    except Exception as exc:
        logger.error(f"Asynchronous restore failed: {exc}")
        raise self.retry(exc=exc, countdown=10)


@shared_task
def auto_backup_task():
    """
    Automated scheduled backup task triggered by Celery Beat.
    """
    from django.core.management import call_command
    logger.info("Triggering scheduled database backup...")
    try:
        call_command('backup_db')
        logger.info("Scheduled database backup completed successfully.")
        return {'status': 'success'}
    except Exception as exc:
        logger.error(f"Scheduled database backup failed: {exc}")
        return {'status': 'failed', 'error': str(exc)}
