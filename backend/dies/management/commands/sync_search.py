from django.core.management.base import BaseCommand
from dies.models import Die
from search.meili import client, init_meilisearch, INDEX_NAME

class Command(BaseCommand):
    help = 'Rebuild and synchronize the Meilisearch index with all dies in the database'

    def handle(self, *args, **options):
        temp_index_name = f"{INDEX_NAME}_temp"
        
        self.stdout.write(f"Preparing temporary index '{temp_index_name}'...")
        try:
            client.index(temp_index_name).delete()
        except Exception:
            pass

        try:
            client.create_index(temp_index_name, {'primaryKey': 'id'})
            temp_idx = client.index(temp_index_name)
            temp_idx.update_settings({
                'searchableAttributes': ['die_id', 'casing', 'status', 'location', 'set', 'machine', 'size', 'width', 'thickness'],
                'filterableAttributes': ['die_type', 'status', 'casing', 'location', 'size', 'width', 'thickness', 'machine'],
                'sortableAttributes':   ['die_id'],
            })
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to initialize temporary index: {e}"))
            return

        self.stdout.write("Fetching all dies from database...")
        dies = Die.objects.select_related('rounddie', 'flatdie', 'current_set__machine').all()
        
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
            self.stdout.write(f"Syncing {len(docs)} documents to temporary index '{temp_index_name}'...")
            task = temp_idx.add_documents(docs)
            task_uid = task.task_uid if hasattr(task, 'task_uid') else task['taskUid']
            
            self.stdout.write("Waiting for indexing to complete in temporary index...")
            client.wait_for_task(task_uid)
            
            # Ensure final index exists to allow swap
            try:
                client.create_index(INDEX_NAME, {'primaryKey': 'id'})
            except Exception:
                pass
                
            self.stdout.write(f"Atomically swapping '{temp_index_name}' with '{INDEX_NAME}'...")
            client.swap_indexes([{'indexes': [INDEX_NAME, temp_index_name]}])
            
            # Clean up temp index
            try:
                client.index(temp_index_name).delete()
            except Exception:
                pass
                
            self.stdout.write(self.style.SUCCESS(f"Successfully synchronized {len(docs)} dies to Meilisearch with zero downtime."))
        else:
            self.stdout.write(self.style.WARNING("No dies found in database to synchronize."))

