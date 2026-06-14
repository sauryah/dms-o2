import time
from django.test import TestCase
from django.urls import reverse
from dies.models import Die, RoundDie
from search.meili import client as meili_client, INDEX_NAME
from decimal import Decimal

class MeilisearchTests(TestCase):
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
            original_size=Decimal("3.500"),
            current_size=Decimal("3.500")
        )
        
        time.sleep(1.0)
        
        index = meili_client.index(INDEX_NAME)
        doc = index.get_document("ROUND-MEILI")
        self.assertEqual(doc.id, "ROUND-MEILI")
        self.assertEqual(doc.status, "AVAILABLE")
        self.assertEqual(getattr(doc, 'size', None), "3.500")

        die.status = "RUNNING"
        die.save()
        
        time.sleep(1.0)
        doc = index.get_document("ROUND-MEILI")
        self.assertEqual(doc.status, "RUNNING")

        url = reverse('search-dies') + "?q=ROUND-MEILI"
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['die_id'], 'ROUND-MEILI')
        self.assertEqual(response.data[0]['status'], 'RUNNING')

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
            original_size=Decimal("3.500"),
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
            original_size=Decimal("5.500"),
            current_size=Decimal("5.500")
        )
        
        time.sleep(1.0)
        
        # Test max filter
        url = reverse('search-dies') + "?q=ROUND-FILTER&size_max=4.000"
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['die_id'], 'ROUND-FILTER-1')

        # Test min filter
        url = reverse('search-dies') + "?q=ROUND-FILTER&size_min=4.000"
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['die_id'], 'ROUND-FILTER-2')

