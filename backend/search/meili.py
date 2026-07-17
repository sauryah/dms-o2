import sys
import logging
import meilisearch
from django.conf import settings

logger = logging.getLogger(__name__)

# Initialize client
client = meilisearch.Client(settings.MEILI_HOST, settings.MEILI_MASTER_KEY)

# Determine the index name dynamically (use dies_test for tests)
IS_TESTING = 'test' in sys.argv
INDEX_NAME = 'dies_test' if IS_TESTING else 'dies'

def init_meilisearch():
    if IS_TESTING:
        logger.info("Skipping Meilisearch initialization during testing.")
        return
    try:
        # Create index if it does not exist
        client.create_index(INDEX_NAME, {'primaryKey': 'id'})
    except Exception as e:
        logger.info(f"Meilisearch index already exists or initialization note: {e}")
    
    try:
        index = client.index(INDEX_NAME)
        index.update_settings({
            'searchableAttributes': ['die_id', 'casing', 'status', 'location', 'set', 'machine', 'size', 'width', 'thickness'],
            'filterableAttributes': ['die_type', 'status', 'casing', 'location', 'size', 'width', 'thickness', 'machine'],
            'sortableAttributes':   ['die_id'],
        })
        logger.info(f"Meilisearch index '{INDEX_NAME}' initialized successfully")
    except Exception as e:
        logger.error(f"Meilisearch connection/init failed: {e}")

def sync_die(die):
    from search.tasks import sync_die_task
    sync_die_task.delay(die.id)

def delete_die_document(die_db_id):
    from search.tasks import delete_die_document_task
    delete_die_document_task.delay(die_db_id)

