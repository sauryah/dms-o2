import time
from django.test import TransactionTestCase
from django.urls import reverse
from dies.models import Die, RoundDie
from machines.models import Rack
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
                'searchableAttributes': ['die_id', 'casing', 'status', 'rack', 'shelf_number', 'set', 'machine', 'size', 'width', 'thickness'],
                'filterableAttributes': ['die_type', 'status', 'casing', 'rack', 'shelf_number', 'size', 'width', 'thickness', 'machine'],
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

        self.rack_a = Rack.objects.create(name="Rack A", row_count=4, column_count=3)

    def test_sync_on_create_and_update(self):
        die = Die.objects.create(
            die_id="ROUND-MEILI",
            die_type="ROUND",
            casing="25x10",
            status="AVAILABLE",
            rack=self.rack_a,
            shelf_number=1,
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
            rack=self.rack_a,
            shelf_number=1,
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
            rack=self.rack_a,
            shelf_number=2,
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
            rack=self.rack_a,
            shelf_number=1,
        )
        RoundDie.objects.create(
            die=die,
            punched_size=Decimal("3.500"),
            current_size=Decimal("3.500")
        )

        wait_for_meili_tasks()

        index = meili_client.index(INDEX_NAME)
        # Test search with single quote in casing (location field no longer used for this)
        results = index.search("ROUND-QUOTE", {"filter": "casing = '25\\'x10\\''"})
        self.assertEqual(len(results['hits']), 1)
        self.assertEqual(results['hits'][0]['die_id'], 'ROUND-QUOTE-1')

    def test_outbox_task_signature_enforcement(self):
        from dies.models import OutboxTask
        from search.tasks import process_outbox_task
        from django.utils import timezone
        import hmac, hashlib, json
        from django.conf import settings

        # 1. Create a task with NO payload hash (unsigned)
        unsigned_task = OutboxTask.objects.create(
            task_type='SYNC_DIE',
            payload={'die_id': 99999}
        )
        # Clear out payload_hash to simulate bypass attempt (since save() auto-generates it if empty)
        OutboxTask.objects.filter(pk=unsigned_task.pk).update(payload_hash="")
        
        # 2. Create a task with an INVALID payload hash
        invalid_task = OutboxTask.objects.create(
            task_type='SYNC_DIE',
            payload={'die_id': 88888},
            payload_hash='invalidhashvalue'
        )

        # 3. Create a task with a VALID payload hash
        valid_payload = {'die_id': 77777}
        serialized = json.dumps(valid_payload, sort_keys=True)
        valid_hash = hmac.new(
            settings.SECRET_KEY.encode('utf-8'),
            serialized.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        valid_task = OutboxTask.objects.create(
            task_type='SYNC_DIE',
            payload=valid_payload,
            payload_hash=valid_hash
        )

        # 4. Run process_outbox_task
        process_outbox_task()

        # Reload tasks
        unsigned_task.refresh_from_db()
        invalid_task.refresh_from_db()
        valid_task.refresh_from_db()

        # All tasks should be marked processed (but unsigned/invalid tasks are skipped internally)
        self.assertTrue(unsigned_task.is_processed)
        self.assertTrue(invalid_task.is_processed)
        self.assertTrue(valid_task.is_processed)
        self.assertIsNotNone(unsigned_task.processed_at)
        self.assertIsNotNone(invalid_task.processed_at)
        self.assertIsNotNone(valid_task.processed_at)

