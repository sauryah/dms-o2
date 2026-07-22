from django.urls import reverse
from rest_framework.test import APITestCase
from dies.models import Die, RoundDie, FlatDie
from machines.models import Rack
from django.db import connection
from decimal import Decimal

class QueryCountTests(APITestCase):
    def setUp(self):
        self.rack_a = Rack.objects.create(name="Rack A", row_count=4, column_count=3)
        self.rack_b = Rack.objects.create(name="Rack B", row_count=4, column_count=3)
        for i in range(25):
            die = Die.objects.create(
                die_id=f"R-{i}",
                die_type="ROUND",
                casing="25x10",
                status="AVAILABLE",
                rack=self.rack_a,
                shelf_number=i % 4 + 1,
            )
            RoundDie.objects.create(
                die=die,
                punched_size=Decimal("2.400"),
                current_size=Decimal("2.400")
            )
        for i in range(25):
            die = Die.objects.create(
                die_id=f"F-{i}",
                die_type="FLAT",
                casing="30x15",
                status="AVAILABLE",
                rack=self.rack_b,
                shelf_number=i % 4 + 1,
            )
            FlatDie.objects.create(
                die=die,
                punched_width=Decimal("5.500"),
                current_width=Decimal("5.500"),
                punched_thickness=Decimal("15.000"),
                current_thickness=Decimal("15.000"),
                radius=Decimal("1.000")
            )

    def test_list_dies_query_count(self):
        url = reverse('die-list')

        connection.queries_log.clear()

        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 50)

        query_count = len(connection.queries)
        print(f"Query count: {query_count}")
        self.assertTrue(query_count <= 5, f"Django executed {query_count} queries, which is > 5!")
