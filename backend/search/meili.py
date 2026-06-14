import sys
import meilisearch
from django.conf import settings

# Initialize client
client = meilisearch.Client(settings.MEILI_HOST, settings.MEILI_MASTER_KEY)

# Determine the index name dynamically (use dies_test for tests)
IS_TESTING = 'test' in sys.argv
INDEX_NAME = 'dies_test' if IS_TESTING else 'dies'

def init_meilisearch():
    try:
        # Create index if it does not exist
        client.create_index(INDEX_NAME, {'primaryKey': 'id'})
    except Exception:
        pass
    
    try:
        index = client.index(INDEX_NAME)
        index.update_settings({
            'searchableAttributes': ['die_id', 'casing', 'status', 'location', 'set', 'machine', 'size', 'width', 'thickness'],
            'filterableAttributes': ['die_type', 'status', 'casing', 'location'],
            'sortableAttributes':   ['die_id'],
        })
    except Exception as e:
        print(f"Meilisearch connection/init failed: {e}")

def sync_die(die):
    doc = {
        'id':       die.die_id,
        'die_id':   die.die_id,
        'type':     die.die_type,
        'die_type': die.die_type,
        'casing':   die.casing,
        'status':   die.status,
        'location': die.location,
        'set':      die.current_set.name if die.current_set else '',
        'machine':  die.current_set.machine.name if die.current_set else '',
    }
    
    # Check for related round or flat die data
    if hasattr(die, 'rounddie') and die.rounddie:
        doc['size'] = f"{die.rounddie.current_size:.3f}"
    if hasattr(die, 'flatdie') and die.flatdie:
        doc['width']     = f"{die.flatdie.current_width:.3f}"
        doc['thickness'] = f"{die.flatdie.current_thickness:.3f}"
        
    try:
        client.index(INDEX_NAME).add_documents([doc])
    except Exception as e:
        print(f"Failed to sync die {die.die_id} to Meilisearch: {e}")

def delete_die_document(die_id):
    try:
        client.index(INDEX_NAME).delete_document(die_id)
    except Exception as e:
        print(f"Failed to delete die {die_id} from Meilisearch: {e}")
