from django.core.management.base import BaseCommand
from dies.models import Die
from search.meili import client, init_meilisearch, INDEX_NAME

class Command(BaseCommand):
    help = 'Rebuild and synchronize the Meilisearch index with all dies in the database'

    def handle(self, *args, **options):
        self.stdout.write(f"Deleting existing '{INDEX_NAME}' index from Meilisearch if it exists...")
        try:
            client.index(INDEX_NAME).delete()
        except Exception:
            pass

        self.stdout.write("Initializing Meilisearch index and settings...")
        init_meilisearch()

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
            self.stdout.write(f"Syncing {len(docs)} documents to Meilisearch...")
            client.index(INDEX_NAME).add_documents(docs)
            self.stdout.write(self.style.SUCCESS(f"Successfully synchronized {len(docs)} dies to Meilisearch."))
        else:
            self.stdout.write(self.style.WARNING("No dies found in database to synchronize."))
