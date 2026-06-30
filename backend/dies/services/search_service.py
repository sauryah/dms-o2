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
        if not hasattr(_thread_locals, 'pending_sync_die_ids'):
            _thread_locals.pending_sync_die_ids = set()
        
        if die_id not in _thread_locals.pending_sync_die_ids:
            _thread_locals.pending_sync_die_ids.add(die_id)
            
            def run_sync():
                _thread_locals.pending_sync_die_ids.discard(die_id)
                from search.tasks import sync_die_task
                sync_die_task.delay(die_id)
                
            transaction.on_commit(run_sync)

    @staticmethod
    def queue_die_broadcast(die_id, action):
        if getattr(_thread_locals, 'skip_single_sync', False):
            return
        if action not in DIE_WORKFLOW_ACTIONS:
            raise ValueError(f"Unsupported die workflow action: {action}")
        if not hasattr(_thread_locals, 'pending_broadcast_keys'):
            _thread_locals.pending_broadcast_keys = set()
            
        broadcast_key = (die_id, action)
        if broadcast_key not in _thread_locals.pending_broadcast_keys:
            _thread_locals.pending_broadcast_keys.add(broadcast_key)
            
            def run_broadcast():
                _thread_locals.pending_broadcast_keys.discard(broadcast_key)
                broadcast_event(DIE_UPDATE_EVENT, {'id': die_id, 'action': action})
                
            transaction.on_commit(run_broadcast)

    @staticmethod
    def sync_dies_batch(die_ids):
        from search.tasks import sync_dies_batch_task
        sync_dies_batch_task.delay(die_ids)

    @staticmethod
    def broadcast_bulk_import():
        broadcast_event(DIE_UPDATE_EVENT, {'action': DIE_BULK_IMPORT_ACTION})

    @staticmethod
    def delete_die_document(die_id):
        transaction.on_commit(lambda: delete_die_document(die_id))

    @staticmethod
    def broadcast_die_delete(die_id):
        transaction.on_commit(lambda: broadcast_event(DIE_UPDATE_EVENT, {'id': die_id, 'action': DIE_DELETE_ACTION}))
