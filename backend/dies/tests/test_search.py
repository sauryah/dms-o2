import time
from django.test import TransactionTestCase
from django.urls import reverse
from dies.models import Die, RoundDie
from search.meili import client as meili_client, INDEX_NAME
from decimal import Decimal

class MeilisearchTests(TransactionTestCase):
    def setUp(self):
        try:
            meili_client.index(INDEX_NAME).delete_all_documents()
        except Exception:
            pass
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
        
        time.sleep(1.0)
        
        index = meili_client.index(INDEX_NAME)
        doc = index.get_document(str(die.id))
        self.assertEqual(doc.id, str(die.id))
        self.assertEqual(doc.status, "AVAILABLE")
        self.assertEqual(getattr(doc, 'size', None), 3.5)

        die.status = "RUNNING"
        die.save()
        time.sleep(1.0)
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
        
        time.sleep(1.0)
        
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
        
        time.sleep(1.0)
        
        index = meili_client.index(INDEX_NAME)
        # Test search with single quote in location
        results = index.search("ROUND-QUOTE", {"filter": "location = 'Rack A\\'s shelf'"})
        self.assertEqual(len(results['hits']), 1)
        self.assertEqual(results['hits'][0]['die_id'], 'ROUND-QUOTE-1')

        # Test search with single quote in casing
        results = index.search("ROUND-QUOTE", {"filter": "casing = '25\\'x10\\''"})
        self.assertEqual(len(results['hits']), 1)
        self.assertEqual(results['hits'][0]['die_id'], 'ROUND-QUOTE-1')

