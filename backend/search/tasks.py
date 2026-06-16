from celery import shared_task
from search.meili import client as meili_client, INDEX_NAME
from dies.models import Die

@shared_task
def sync_die_task(die_id):
    try:
        die = Die.objects.select_related('current_set__machine', 'rounddie', 'flatdie').get(id=die_id)
    except Die.DoesNotExist:
        return
        
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
    except Exception as e:
        print(f"Failed to sync die {die.die_id} to Meilisearch: {e}")

@shared_task
def delete_die_document_task(die_db_id):
    doc_id = str(die_db_id)
    try:
        meili_client.index(INDEX_NAME).delete_document(doc_id)
    except Exception as e:
        print(f"Failed to delete die {doc_id} from Meilisearch: {e}")
