import logging
from celery import shared_task
from celery.signals import task_failure, task_success
from celery.utils.log import get_task_logger
from dies.contracts import BACKUP_RESTORE_ACTION, BACKUP_UPDATE_EVENT
from search.meili import client as meili_client, INDEX_NAME
from dies.models import Die

logger = get_task_logger(__name__)

@task_failure.connect
def handle_task_failure(sender=None, task_id=None, exception=None, traceback=None, **kwargs):
    """Signal handler for task failures - logs comprehensive error information"""
    logger.error(
        f"Task {task_id} failed with exception: {exception}",
        exc_info=traceback,
        extra={'task_id': task_id, 'exception': str(exception)}
    )

@task_success.connect
def handle_task_success(sender=None, result=None, task_id=None, args=None, kwargs=None, **kwargs2):
    """Signal handler for successful task completion"""
    logger.info(f"Task {task_id} completed successfully", extra={'task_id': task_id})

@shared_task(bind=True, max_retries=3)
def sync_die_task(self, die_id):
    """
    Sync a die to Meilisearch index.
    
    Retries up to 3 times on failure with exponential backoff.
    Args:
        die_id: ID of the die to sync
    """
    try:
        logger.info(f"Starting sync for die ID: {die_id}")
        die = Die.objects.select_related('current_set__machine', 'rounddie', 'flatdie').get(id=die_id)
    except Die.DoesNotExist:
        logger.warning(f"Die with ID {die_id} not found")
        return {'status': 'not_found', 'die_id': die_id}
        
    doc = {
        'id':       str(die.id),
        'die_id':   die.die_id,
        'type':     die.die_type,
        'die_type': die.die_type,
        'casing':   die.casing,
        'status':   die.status,
        'location': die.location,
        'set':      die.current_set.name if die.current_set else '',
        'machine':  die.current_set.machine.name if die.current_set else '',
    }
    
    if hasattr(die, 'rounddie') and die.rounddie:
        doc['size'] = float(die.rounddie.current_size)
    if hasattr(die, 'flatdie') and die.flatdie:
        doc['width']     = float(die.flatdie.current_width)
        doc['thickness'] = float(die.flatdie.current_thickness)
    
    try:
        meili_client.index(INDEX_NAME).add_documents([doc])
        logger.info(f"Successfully synced die {die.die_id} to Meilisearch", extra={'die_id': die.die_id})
        return {'status': 'synced', 'die_id': die.die_id}
    except Exception as exc:
        logger.error(
            f"Failed to sync die {die.die_id} to Meilisearch (attempt {self.request.retries}): {exc}",
            extra={'die_id': die.die_id, 'exception': str(exc)}
        )
        # Retry with exponential backoff: 60s, 300s, 600s
        retry_delay = 60 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=retry_delay)

@shared_task(bind=True, max_retries=3)
def delete_die_document_task(self, die_db_id):
    """
    Delete a die from Meilisearch index.
    
    Retries up to 3 times on failure with exponential backoff.
    Args:
        die_db_id: Database ID of the die to delete
    """
    doc_id = str(die_db_id)
    
    try:
        logger.info(f"Starting deletion for die document ID: {doc_id}")
        meili_client.index(INDEX_NAME).delete_document(doc_id)
        logger.info(f"Successfully deleted die {doc_id} from Meilisearch", extra={'die_id': doc_id})
        return {'status': 'deleted', 'die_id': doc_id}
    except Exception as exc:
        logger.error(
            f"Failed to delete die {doc_id} from Meilisearch (attempt {self.request.retries}): {exc}",
            extra={'die_id': doc_id, 'exception': str(exc)}
        )
        # Retry with exponential backoff: 60s, 300s, 600s
        retry_delay = 60 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=retry_delay)

@shared_task(bind=True, max_retries=3)
def sync_dies_batch_task(self, die_ids):
    """
    Sync a batch of dies to Meilisearch index.
    
    Retries up to 3 times on failure with exponential backoff.
    Args:
        die_ids: List of database IDs of the dies to sync
    """
    import redis
    import json
    from django.conf import settings
    from search.meili import client as meili_client, INDEX_NAME
    from dies.models import Die

    redis_url = settings.CACHES['default']['LOCATION']
    r = redis.Redis.from_url(redis_url)

    def update_status(status, progress, total, message=None):
        payload = {"status": status, "progress": progress, "total": total}
        if message:
            payload["message"] = message
        try:
            r.set('search_index_status', json.dumps(payload))
        except Exception as e:
            logger.error(f"Failed to write progress to Redis: {e}")

    total_dies = len(die_ids)
    if total_dies == 0:
        return {'status': 'empty'}

    try:
        logger.info(f"Starting batch sync for {total_dies} dies with progress tracking")
        
        # If it is a substantial batch, show progress bar on the dashboard
        if total_dies > 20:
            update_status("rebuilding", 0, 100, f"Synchronizing {total_dies} dies to search index...")

        batch_size = 100
        for i in range(0, total_dies, batch_size):
            chunk_ids = die_ids[i:i+batch_size]
            dies = Die.objects.select_related('current_set__machine', 'rounddie', 'flatdie').filter(id__in=chunk_ids)
            
            docs = []
            for die in dies:
                doc = {
                    'id':       str(die.id),
                    'die_id':   die.die_id,
                    'type':     die.die_type,
                    'die_type': die.die_type,
                    'casing':   die.casing,
                    'status':   die.status,
                    'location': die.location,
                    'set':      die.current_set.name if die.current_set else '',
                    'machine':  die.current_set.machine.name if die.current_set else '',
                }
                if hasattr(die, 'rounddie') and die.rounddie:
                    doc['size'] = float(die.rounddie.current_size)
                if hasattr(die, 'flatdie') and die.flatdie:
                    doc['width']     = float(die.flatdie.current_width)
                    doc['thickness'] = float(die.flatdie.current_thickness)
                docs.append(doc)

            if docs:
                task = meili_client.index(INDEX_NAME).add_documents(docs)
                task_uid = task.task_uid if hasattr(task, 'task_uid') else task['taskUid']
                meili_client.wait_for_task(task_uid)

            if total_dies > 20:
                progress = int(min(99, ((i + len(chunk_ids)) / total_dies) * 100))
                update_status("rebuilding", progress, 100, f"Synchronizing {total_dies} dies to search index...")

        if total_dies > 20:
            update_status("ready", 100, 100)
            
        logger.info(f"Successfully batch-synced {total_dies} dies to Meilisearch")
        return {'status': 'synced', 'count': total_dies}
        
    except Exception as exc:
        if total_dies > 20:
            update_status("error", 0, 100, str(exc))
        logger.error(f"Failed to query or sync dies for batch: {exc}")
        raise self.retry(exc=exc, countdown=10)


@shared_task(bind=True, max_retries=3)
def rebuild_search_index_task(self, filename=None):
    """
    Rebuild and synchronize the Meilisearch index with all dies in the database.
    Optionally broadcasts the restore complete event when finished.
    Tracks rebuild progress in Redis search_index_status key.
    """
    import redis
    import json
    from django.conf import settings
    from search.meili import client as meili_client, INDEX_NAME
    from dies.models import Die

    redis_url = settings.CACHES['default']['LOCATION']
    r = redis.Redis.from_url(redis_url)

    def update_status(status, progress, total, message=None):
        payload = {"status": status, "progress": progress, "total": total}
        if message:
            payload["message"] = message
        try:
            r.set('search_index_status', json.dumps(payload))
        except Exception as e:
            logger.error(f"Failed to write progress to Redis: {e}")

    try:
        logger.info("Starting search index rebuild task with progress tracking...")
        update_status("rebuilding", 0, 100)
        temp_index_name = f"{INDEX_NAME}_temp"
        
        # 1. Clean temp index if left over
        try:
            meili_client.index(temp_index_name).delete()
        except Exception:
            pass

        try:
            meili_client.create_index(temp_index_name, {'primaryKey': 'id'})
            temp_idx = meili_client.index(temp_index_name)
            temp_idx.update_settings({
                'searchableAttributes': ['die_id', 'casing', 'status', 'location', 'set', 'machine', 'size', 'width', 'thickness'],
                'filterableAttributes': ['die_type', 'status', 'casing', 'location', 'size', 'width', 'thickness', 'machine'],
                'sortableAttributes':   ['die_id'],
            })
        except Exception as e:
            update_status("error", 0, 100, f"Failed to initialize temp index: {str(e)}")
            raise e

        # 2. Fetch all dies
        dies = list(Die.objects.select_related('rounddie', 'flatdie', 'current_set__machine').all())
        total_dies = len(dies)
        
        if total_dies == 0:
            # Swap empty index
            try:
                meili_client.create_index(INDEX_NAME, {'primaryKey': 'id'})
            except Exception:
                pass
            meili_client.swap_indexes([{'indexes': [INDEX_NAME, temp_index_name]}])
            try:
                meili_client.index(temp_index_name).delete()
            except Exception:
                pass
            update_status("ready", 100, 100)
            if filename:
                try:
                    from dms.events import broadcast_event
                    broadcast_event(BACKUP_UPDATE_EVENT, {'action': BACKUP_RESTORE_ACTION, 'filename': filename})
                except Exception as e:
                    logger.error(f"Failed to broadcast restore update: {e}")
            return {'status': 'success'}

        # 3. Batch insert documents and track progress
        batch_size = 100
        docs = []
        for idx, die in enumerate(dies):
            doc = {
                'id':       str(die.id),
                'die_id':   die.die_id,
                'type':     die.die_type,
                'die_type': die.die_type,
                'casing':   die.casing,
                'status':   die.status,
                'location': die.location,
                'set':      die.current_set.name if die.current_set else '',
                'machine':  die.current_set.machine.name if die.current_set else '',
            }
            if hasattr(die, 'rounddie') and die.rounddie:
                doc['size'] = float(die.rounddie.current_size)
            if hasattr(die, 'flatdie') and die.flatdie:
                doc['width']     = float(die.flatdie.current_width)
                doc['thickness'] = float(die.flatdie.current_thickness)
            docs.append(doc)

            # Upload batch when batch_size is reached or on the last item
            if len(docs) == batch_size or idx == total_dies - 1:
                task = temp_idx.add_documents(docs)
                task_uid = task.task_uid if hasattr(task, 'task_uid') else task['taskUid']
                meili_client.wait_for_task(task_uid)
                docs = []
                # Compute progress (up to 90% before swap)
                progress = int((idx + 1) / total_dies * 90)
                update_status("rebuilding", progress, 100)

        # 4. Swap and cleanup
        try:
            meili_client.create_index(INDEX_NAME, {'primaryKey': 'id'})
        except Exception:
            pass
            
        meili_client.swap_indexes([{'indexes': [INDEX_NAME, temp_index_name]}])
        
        try:
            meili_client.index(temp_index_name).delete()
        except Exception:
            pass

        update_status("ready", 100, 100)
        logger.info("Search index rebuild task completed successfully with progress tracking.")
        
        if filename:
            try:
                from dms.events import broadcast_event
                broadcast_event(BACKUP_UPDATE_EVENT, {'action': BACKUP_RESTORE_ACTION, 'filename': filename})
            except Exception as e:
                logger.error(f"Failed to broadcast restore update event: {e}")
                
        return {'status': 'success'}
    except Exception as exc:
        update_status("error", 0, 100, str(exc))
        logger.error(
            f"Failed to rebuild search index (attempt {self.request.retries}): {exc}",
            extra={'exception': str(exc)}
        )
        retry_delay = 30 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=retry_delay)


@shared_task(bind=True, max_retries=5)
def process_outbox_task(self):
    """
    Process pending OutboxTask records and perform actual Meilisearch sync operations.
    """
    from dies.models import OutboxTask
    from django.utils import timezone
    
    # Query all unprocessed outbox records ordered by creation time
    pending_tasks = OutboxTask.objects.filter(is_processed=False).order_by('created_at')
    
    logger.info(f"Processing outbox. Found {pending_tasks.count()} pending tasks.")
    
    for task in pending_tasks:
        try:
            if task.task_type == 'SYNC_DIE':
                die_db_id = task.payload.get('die_id')
                # call the task synchronously inside our worker to process it immediately
                sync_die_task(die_db_id)
            elif task.task_type == 'DELETE_DIE':
                die_db_id = task.payload.get('die_id')
                delete_die_document_task(die_db_id)
            
            task.is_processed = True
            task.processed_at = timezone.now()
            task.save()
            logger.info(f"Successfully processed outbox task {task.id} (Type: {task.task_type})")
        except Exception as exc:
            logger.error(f"Failed to process outbox task {task.id} (Type: {task.task_type}): {exc}")
