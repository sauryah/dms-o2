from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

User = get_user_model()


class MetallurgyViewsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='metallurgist',
            password='Password123!',
            role='ADMIN',
        )
        self.client.force_authenticate(user=self.user)

    def test_materials_catalog(self):
        response = self.client.get('/api/v1/metallurgy/materials/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['status'], 'success')
        materials = {m['id']: m for m in data['materials']}
        self.assertIn('copper', materials)
        self.assertIn('high_carbon_steel', materials)
        self.assertIn('aluminum', materials)
        self.assertIn('brass', materials)

    def test_materials_unauthenticated(self):
        self.client.logout()
        response = self.client.get('/api/v1/metallurgy/materials/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_wear_progression_endpoint_success(self):
        payload = {
            "tonnage": [10.0, 25.0, 50.0, 75.0, 100.0],
            "wear_um": [1.5, 3.2, 5.8, 8.1, 10.4],
            "tolerance_um": 12.0,
        }
        response = self.client.post('/api/v1/metallurgy/wear/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['model'], 'archard_wear')
        results = data['results']
        self.assertIn('a_coeff', results)
        self.assertIn('b_exp', results)
        self.assertIn('wear_regime', results)
        self.assertGreater(results['r_squared'], 0.90)
        self.assertGreater(results['predicted_tonnage_limit'], 100.0)

    def test_wear_progression_mismatched_arrays(self):
        payload = {
            "tonnage": [10.0, 25.0],
            "wear_um": [1.5],
        }
        response = self.client.post('/api/v1/metallurgy/wear/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_flow_stress_endpoint_success(self):
        payload = {
            "material": "copper",
            "strain": 0.35,
            "strain_rate": 100.0,
            "temperature_c": 120.0,
        }
        response = self.client.post('/api/v1/metallurgy/flow-stress/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['model'], 'johnson_cook')
        self.assertEqual(data['material'], 'Copper (Cu-ETP)')
        results = data['results']
        self.assertGreater(results['flow_stress_mpa'], 0)
        self.assertGreater(results['adiabatic_temp_rise_c'], 0)

    def test_flow_stress_invalid_material(self):
        payload = {
            "material": "titanium_unsupported",
            "strain": 0.20,
        }
        response = self.client.post('/api/v1/metallurgy/flow-stress/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reliability_endpoint_success(self):
        payload = {
            "lifetimes": [110.0, 145.0, 180.0, 210.0, 240.0, 280.0, 310.0],
        }
        response = self.client.post('/api/v1/metallurgy/reliability/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['model'], 'weibull_reliability')
        results = data['results']
        self.assertIn('failure_mechanism', results)
        self.assertGreater(results['beta_shape'], 1.0)
        self.assertGreater(results['eta_scale'], 100.0)
        self.assertGreater(results['b10_life'], 0)
        self.assertGreater(results['mttc_mean_life'], 0)

    def test_reliability_insufficient_samples(self):
        payload = {
            "lifetimes": [150.0],
        }
        response = self.client.post('/api/v1/metallurgy/reliability/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
