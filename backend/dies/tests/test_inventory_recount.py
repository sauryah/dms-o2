from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import AccessToken
from users.models import User, UserSession
import hashlib
from decimal import Decimal
from dies.models import MachineDieStock, DieInventoryRecount, DieInventoryRecountItem
from machines.models import Machine, MachineCategory

class DieInventoryRecountAPITests(APITestCase):
    def setUp(self):
        # Create user & auth session
        self.operator_user = User.objects.create_user(
            username='operator',
            password='password123',
            email='operator@dms.local',
            role='OPERATOR'
        )
        self.operator_token = str(AccessToken.for_user(self.operator_user))

        token_hash = hashlib.sha256(self.operator_token.encode('utf-8')).hexdigest()
        UserSession.objects.create(
            user=self.operator_user,
            token_hash=token_hash
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.operator_token}')

        # Setup Category & Machine
        self.category = MachineCategory.objects.create(name="Drawing Machines")
        self.machine_a = Machine.objects.create(category=self.category, name="Machine A")
        self.machine_b = Machine.objects.create(category=self.category, name="Machine B")

        # Initial stock levels
        self.stock_1 = MachineDieStock.objects.create(
            machine=self.machine_a,
            die_size=Decimal("0.620"),
            quantity=5
        )
        self.stock_2 = MachineDieStock.objects.create(
            machine=self.machine_a,
            die_size=Decimal("0.625"),
            quantity=3
        )

    def test_get_machine_die_stock_list(self):
        url = reverse('machine-die-stock-list')
        response = self.client.get(url, {'machine': self.machine_a.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]['die_size'], '0.620')
        self.assertEqual(response.data[0]['quantity'], 5)

    def test_create_inventory_recount_draft(self):
        url = reverse('inventory-recount-list')
        data = {
            "name": "August 2026 Audit",
            "machine": self.machine_a.id,
            "recount_date": "2026-08-10",
            "items": [
                {"die_size": "0.620", "quantity": 6},
                {"die_size": "0.625", "quantity": 4},
                {"die_size": "0.630", "quantity": 2}
            ]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'DRAFT')
        self.assertEqual(response.data['created_by_username'], 'operator')
        
        # Verify db items
        recount_id = response.data['id']
        items = DieInventoryRecountItem.objects.filter(recount_id=recount_id)
        self.assertEqual(items.count(), 3)
        self.assertEqual(items.get(die_size=Decimal("0.620")).quantity, 6)

    def test_update_inventory_recount_draft(self):
        recount = DieInventoryRecount.objects.create(
            name="September 2026 Audit",
            machine=self.machine_a,
            recount_date="2026-09-01",
            created_by=self.operator_user
        )
        item1 = DieInventoryRecountItem.objects.create(recount=recount, die_size=Decimal("0.620"), quantity=5)

        url = reverse('inventory-recount-detail', args=[recount.id])
        data = {
            "name": "September 2026 Audit - Revised",
            "machine": self.machine_a.id,
            "recount_date": "2026-09-02",
            "items": [
                {"die_size": "0.620", "quantity": 7},
                {"die_size": "0.640", "quantity": 1}
            ]
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], "September 2026 Audit - Revised")

        # Verify old item deleted, new items created
        items = DieInventoryRecountItem.objects.filter(recount=recount)
        self.assertEqual(items.count(), 2)
        self.assertEqual(items.get(die_size=Decimal("0.620")).quantity, 7)
        self.assertEqual(items.get(die_size=Decimal("0.640")).quantity, 1)

    def test_submit_inventory_recount_updates_live_stock(self):
        recount = DieInventoryRecount.objects.create(
            name="August 2026 Audit",
            machine=self.machine_a,
            recount_date="2026-08-10",
            created_by=self.operator_user
        )
        DieInventoryRecountItem.objects.create(recount=recount, die_size=Decimal("0.620"), quantity=8)
        DieInventoryRecountItem.objects.create(recount=recount, die_size=Decimal("0.630"), quantity=3)

        url = reverse('inventory-recount-submit', args=[recount.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        recount.refresh_from_db()
        self.assertEqual(recount.status, 'SUBMITTED')

        # Live stock checks
        stock = MachineDieStock.objects.filter(machine=self.machine_a)
        # Size 0.625 (originally had 3) should be deleted/missing now because recount audit resets active stock
        self.assertEqual(stock.count(), 2)
        self.assertEqual(stock.get(die_size=Decimal("0.620")).quantity, 8)
        self.assertEqual(stock.get(die_size=Decimal("0.630")).quantity, 3)

        # Modifying submitted recount should fail
        url_detail = reverse('inventory-recount-detail', args=[recount.id])
        update_data = {
            "name": "August 2026 Audit - Mod",
            "machine": self.machine_a.id,
            "recount_date": "2026-08-10",
            "items": []
        }
        res_update = self.client.put(url_detail, update_data, format='json')
        self.assertEqual(res_update.status_code, status.HTTP_400_BAD_REQUEST)
