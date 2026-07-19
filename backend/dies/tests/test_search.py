import time
from django.test import TransactionTestCase
from django.urls import reverse
from dies.models import Die, RoundDie
from search.meili import client as meili_client, INDEX_NAME
from decimal import Decimal

def wait_for_meili_tasks():
    try:
        for _ in range(50):
            tasks = meili_client.get_tasks({'statuses': ['enqueued', 'processing'], 'indexUids': [INDEX_NAME]})
            if not tasks.results:
                break
            time.sleep(0.1)
    except Exception:
        pass

class MeilisearchTests(TransactionTestCase):
    def setUp(self):
        try:
            meili_client.index(INDEX_NAME).delete()
        except Exception:
            pass
        try:
            meili_client.create_index(INDEX_NAME, {'primaryKey': 'id'})
        except Exception:
            pass
        try:
            index = meili_client.index(INDEX_NAME)
            task = index.update_settings({
                'searchableAttributes': ['die_id', 'casing', 'status', 'location', 'set', 'machine', 'size', 'width', 'thickness'],
                'filterableAttributes': ['die_type', 'status', 'casing', 'location', 'size', 'width', 'thickness', 'machine'],
                'sortableAttributes':   ['die_id'],
            })
            uid = task.get('taskUid') or task.get('task_uid')
            meili_client.wait_for_task(uid, timeout_in_ms=5000)
        except Exception:
            pass
        
        try:
            task = meili_client.index(INDEX_NAME).delete_all_documents()
            uid = task.get('taskUid') or task.get('task_uid')
            meili_client.wait_for_task(uid, timeout_in_ms=5000)
        except Exception:
            time.sleep(0.5)

    def test_sync_on_create_and_update(self):
        die = Die.objects.create(
            die_id="ROUND-MEILI",
            die_type="ROUND",
            casing="25x10",
            status="AVAILABLE",
            location="Rack A"
        )
        round_die = RoundDie.objects.create(
            die=die,
            punched_size=Decimal("3.500"),
            current_size=Decimal("3.500")
        )
        
        wait_for_meili_tasks()
        
        index = meili_client.index(INDEX_NAME)
        doc = index.get_document(str(die.id))
        self.assertEqual(doc.id, str(die.id))
        self.assertEqual(doc.status, "AVAILABLE")
        self.assertEqual(getattr(doc, 'size', None), 3.5)

        die.status = "RUNNING"
        die.save()
        wait_for_meili_tasks()
        doc = index.get_document(str(die.id))
        self.assertEqual(doc.status, "RUNNING")

        results = index.search("ROUND-MEILI")
        self.assertEqual(len(results['hits']), 1)
        self.assertEqual(results['hits'][0]['die_id'], 'ROUND-MEILI')
        self.assertEqual(results['hits'][0]['status'], 'RUNNING')

    def test_search_with_range_filters(self):
        die1 = Die.objects.create(
            die_id="ROUND-FILTER-1",
            die_type="ROUND",
            casing="25x10",
            status="AVAILABLE",
            location="Rack A"
        )
        RoundDie.objects.create(
            die=die1,
            punched_size=Decimal("3.500"),
            current_size=Decimal("3.500")
        )
        
        die2 = Die.objects.create(
            die_id="ROUND-FILTER-2",
            die_type="ROUND",
            casing="25x10",
            status="AVAILABLE",
            location="Rack A"
        )
        RoundDie.objects.create(
            die=die2,
            punched_size=Decimal("5.500"),
            current_size=Decimal("5.500")
        )
        
        wait_for_meili_tasks()
        
        index = meili_client.index(INDEX_NAME)
        # Test max filter
        results = index.search("ROUND-FILTER", {"filter": "size <= 4.0"})
        self.assertEqual(len(results['hits']), 1)
        self.assertEqual(results['hits'][0]['die_id'], 'ROUND-FILTER-1')

        # Test min filter
        results = index.search("ROUND-FILTER", {"filter": "size >= 4.0"})
        self.assertEqual(len(results['hits']), 1)
        self.assertEqual(results['hits'][0]['die_id'], 'ROUND-FILTER-2')

    def test_search_with_single_quote_filters(self):
        die = Die.objects.create(
            die_id="ROUND-QUOTE-1",
            die_type="ROUND",
            casing="25'x10'",
            status="AVAILABLE",
            location="Rack A's shelf"
        )
        RoundDie.objects.create(
            die=die,
            punched_size=Decimal("3.500"),
            current_size=Decimal("3.500")
        )
        
        wait_for_meili_tasks()
        
        index = meili_client.index(INDEX_NAME)
        # Test search with single quote in location
        results = index.search("ROUND-QUOTE", {"filter": "location = 'Rack A\\'s shelf'"})
        self.assertEqual(len(results['hits']), 1)
        self.assertEqual(results['hits'][0]['die_id'], 'ROUND-QUOTE-1')

        # Test search with single quote in casing
        results = index.search("ROUND-QUOTE", {"filter": "casing = '25\\'x10\\''"})
        self.assertEqual(len(results['hits']), 1)
        self.assertEqual(results['hits'][0]['die_id'], 'ROUND-QUOTE-1')

