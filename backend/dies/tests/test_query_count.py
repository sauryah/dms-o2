from django.urls import reverse
from rest_framework.test import APITestCase
from dies.models import Die, RoundDie, FlatDie
from django.db import connection
from decimal import Decimal

class QueryCountTests(APITestCase):
    def setUp(self):
        for i in range(25):
            die = Die.objects.create(
                die_id=f"R-{i}",
                die_type="ROUND",
                casing="25x10",
                status="AVAILABLE",
                location="Rack A",
            )
            RoundDie.objects.create(
                die=die,
                original_size=Decimal("2.400"),
                current_size=Decimal("2.400")
            )
        for i in range(25):
            die = Die.objects.create(
                die_id=f"F-{i}",
                die_type="FLAT",
                casing="30x15",
                status="AVAILABLE",
                location="Rack B",
            )
            FlatDie.objects.create(
                die=die,
                original_width=Decimal("5.500"),
                current_width=Decimal("5.500"),
                original_thickness=Decimal("15.000"),
                current_thickness=Decimal("15.000"),
                radius=Decimal("1.000")
            )

    def test_list_dies_query_count(self):
        url = reverse('die-list')
        
        # Clear the queries log
        connection.queries_log.clear()
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 50)
        
        query_count = len(connection.queries)
        print(f"Query count: {query_count}")
        self.assertTrue(query_count <= 5, f"Django executed {query_count} queries, which is > 5!")
