from django.core.management.base import BaseCommand
from dies.models import Die
from search.meili import client, init_meilisearch

class Command(BaseCommand):
    help = 'Rebuild and synchronize the Meilisearch index with all dies in the database'

    def handle(self, *args, **options):
        self.stdout.write("Deleting existing 'dies' index from Meilisearch if it exists...")
        try:
            client.index('dies').delete()
        except Exception:
            pass

        self.stdout.write("Initializing Meilisearch index and settings...")
        init_meilisearch()

        self.stdout.write("Fetching all dies from database...")
        dies = Die.objects.select_related('rounddie', 'flatdie', 'current_set__machine').all()
        
        docs = []
        for die in dies:
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
            if hasattr(die, 'rounddie') and die.rounddie:
                doc['size'] = f"{die.rounddie.current_size:.3f}"
            if hasattr(die, 'flatdie') and die.flatdie:
                doc['width']     = f"{die.flatdie.current_width:.3f}"
                doc['thickness'] = f"{die.flatdie.current_thickness:.3f}"
            docs.append(doc)

        if docs:
            self.stdout.write(f"Syncing {len(docs)} documents to Meilisearch...")
            client.index('dies').add_documents(docs)
            self.stdout.write(self.style.SUCCESS(f"Successfully synchronized {len(docs)} dies to Meilisearch."))
        else:
            self.stdout.write(self.style.WARNING("No dies found in database to synchronize."))
