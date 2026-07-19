from django.db import transaction
from users.middleware import _thread_locals
from search.meili import delete_die_document
from dms.events import broadcast_event
from dies.contracts import (
    DIE_BULK_IMPORT_ACTION,
    DIE_DELETE_ACTION,
    DIE_UPDATE_EVENT,
    DIE_WORKFLOW_ACTIONS,
)

class SearchService:
    @staticmethod
    def queue_die_sync(die_id):
        if getattr(_thread_locals, 'skip_single_sync', False):
            return
        pending = _thread_locals.pending_sync_die_ids
        if pending is None:
            pending = set()
            _thread_locals.pending_sync_die_ids = pending
        
        if die_id not in pending:
            pending.add(die_id)
            
            def run_sync():
                pending.discard(die_id)
                from dies.models import OutboxTask
                from search.tasks import process_outbox_task
                OutboxTask.objects.create(task_type='SYNC_DIE', payload={'die_id': die_id})
                process_outbox_task.delay()
                
            transaction.on_commit(run_sync)

    @staticmethod
    def queue_die_broadcast(die_id, action):
        if getattr(_thread_locals, 'skip_single_sync', False):
            return
        if action not in DIE_WORKFLOW_ACTIONS:
            raise ValueError(f"Unsupported die workflow action: {action}")
        pending = _thread_locals.pending_broadcast_keys
        if pending is None:
            pending = set()
            _thread_locals.pending_broadcast_keys = pending
            
        broadcast_key = (die_id, action)
        if broadcast_key not in pending:
            pending.add(broadcast_key)
            
            def run_broadcast():
                pending.discard(broadcast_key)
                broadcast_event(DIE_UPDATE_EVENT, {'id': die_id, 'action': action})
                
            transaction.on_commit(run_broadcast)

    @staticmethod
    def sync_dies_batch(die_ids):
        from dies.models import OutboxTask
        from search.tasks import process_outbox_task
        import json, hmac, hashlib
        from django.conf import settings

        tasks = []
        for die_id in die_ids:
            payload = {'die_id': die_id}
            serialized = json.dumps(payload, sort_keys=True)
            payload_hash = hmac.new(
                settings.SECRET_KEY.encode('utf-8'),
                serialized.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            tasks.append(
                OutboxTask(
                    task_type='SYNC_DIE',
                    payload=payload,
                    payload_hash=payload_hash
                )
            )

        if tasks:
            OutboxTask.objects.bulk_create(tasks)
        process_outbox_task.delay()

    @staticmethod
    def broadcast_bulk_import():
        broadcast_event(DIE_UPDATE_EVENT, {'action': DIE_BULK_IMPORT_ACTION})

    @staticmethod
    def delete_die_document(die_id):
        def run_delete():
            from dies.models import OutboxTask
            from search.tasks import process_outbox_task
            OutboxTask.objects.create(task_type='DELETE_DIE', payload={'die_id': die_id})
            process_outbox_task.delay()
        transaction.on_commit(run_delete)

    @staticmethod
    def broadcast_die_delete(die_id):
        transaction.on_commit(lambda: broadcast_event(DIE_UPDATE_EVENT, {'id': die_id, 'action': DIE_DELETE_ACTION}))
