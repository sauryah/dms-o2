import os
import redis
import json
import logging
from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from dies.services.import_service import ImportService
from dies.models import ImportLog

logger = logging.getLogger(__name__)

@shared_task
def import_dies_task(file_path, file_ext, username, filename, dry_run=False):
    User = get_user_model()
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        user = None

    redis_url = settings.CACHES['default']['LOCATION']
    r = redis.Redis.from_url(redis_url)

    def update_status(status, progress, total, message=None, result=None):
        payload = {
            "status": status,
            "progress": progress,
            "total": total,
            "filename": filename,
            "dry_run": dry_run
        }
        if message:
            payload["message"] = message
        if result:
            payload["result"] = result
        try:
            r.set('import_status', json.dumps(payload))
        except Exception as e:
            logger.error(f"Failed to write import progress to Redis: {e}")

    try:
        update_status("importing", 0, 100)
        
        def progress_callback(current, total):
            update_status("importing", current, total)

        result = ImportService.import_dies(file_path, file_ext, user, dry_run=dry_run, progress_callback=progress_callback)
        
        if not dry_run and user:
            ImportLog.objects.create(
                imported_by=user,
                filename=filename,
                created_count=result.get('created', 0),
                updated_count=result.get('updated', 0),
                skipped_count=result.get('skipped', 0),
                error_count=len(result.get('errors', [])),
                errors_json=result.get('errors', [])
            )
            
        update_status("ready", result.get('created', 0) + result.get('updated', 0) + result.get('skipped', 0) + len(result.get('errors', [])), result.get('created', 0) + result.get('updated', 0) + result.get('skipped', 0) + len(result.get('errors', [])), result=result)
    except Exception as e:
        logger.exception("Async import dies task failed")
        update_status("error", 0, 100, message=str(e))
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


@shared_task
def check_all_wear_alerts_task():
    """
    Daily cron task to evaluate wear alerts for all active dies in the system,
    creating alerts and triggering real-time SSE updates where necessary.
    """
    from dies.models import Die
    from dies.services.wear_alert_service import WearAlertService
    from dies.services.search_service import SearchService
    from dies.contracts import DIE_SAVE_ACTION

    logger.info("Starting automated daily wear alert checking engine...")
    active_dies = Die.objects.exclude(status='SCRAPPED').select_related('rounddie', 'flatdie')
    count = 0
    for die in active_dies:
        try:
            WearAlertService.check_wear_alerts(die)
            # Sync search index and broadcast SSE events to push live warnings to the UI
            SearchService.queue_die_sync(die.id)
            SearchService.queue_die_broadcast(die.die_id, DIE_SAVE_ACTION)
            count += 1
        except Exception as e:
            logger.error(f"Failed to check wear alerts for die {die.die_id}: {e}")

    logger.info(f"Finished check. Evaluated wear alerts for {count} active dies.")
    return {'status': 'success', 'checked_count': count}
