from django.test import SimpleTestCase
from dies.services.metallurgy_service import MetallurgyService, JOHNSON_COOK_MATERIALS


class MetallurgyServiceTests(SimpleTestCase):
    def test_archard_wear_progression_steady_state(self):
        tonnage = [10.0, 20.0, 30.0, 50.0]
        wear_um = [2.0, 3.6, 5.0, 7.8]
        res = MetallurgyService.analyze_wear_progression(tonnage, wear_um, tolerance_um=12.0)

        self.assertEqual(res.get("status"), "success")
        self.assertEqual(res.get("model"), "archard_wear")
        results = res.get("results", {})
        self.assertIn("a_coeff", results)
        self.assertIn("b_exp", results)
        self.assertGreater(results["r_squared"], 0.95)
        self.assertIn("Steady-State Abrasive", results["wear_regime"])
        self.assertGreater(results["remaining_tonnage"], 0.0)
        self.assertLessEqual(results["life_consumed_percent"], 100.0)

    def test_archard_wear_validation_error(self):
        # Single data point should fail validation
        res = MetallurgyService.analyze_wear_progression([10.0], [2.0], tolerance_um=12.0)
        self.assertEqual(res.get("status"), "error")
        self.assertIn("At least 2 data points", res.get("message", ""))

    def test_johnson_cook_all_materials(self):
        materials = ["copper", "high_carbon_steel", "aluminum", "brass"]
        for mat in materials:
            res = MetallurgyService.analyze_viscoplasticity(
                material=mat,
                strain=0.40,
                strain_rate=100.0,
                temperature_c=80.0,
            )
            self.assertEqual(res.get("status"), "success")
            self.assertEqual(res.get("model"), "johnson_cook")
            results = res.get("results", {})
            self.assertGreater(results["flow_stress_mpa"], results["static_stress_mpa"] * 0.5)
            self.assertGreater(results["strain_rate_enhancement_factor"], 1.0)
            self.assertLess(results["thermal_softening_factor"], 1.0)
            self.assertGreater(results["adiabatic_temp_rise_c"], 0.0)

    def test_johnson_cook_thermal_softening_progression(self):
        res_cold = MetallurgyService.analyze_viscoplasticity("copper", strain=0.30, temperature_c=25.0)
        res_hot = MetallurgyService.analyze_viscoplasticity("copper", strain=0.30, temperature_c=500.0)

        self.assertGreater(
            res_cold["results"]["flow_stress_mpa"],
            res_hot["results"]["flow_stress_mpa"],
        )
        self.assertGreater(
            res_hot["results"]["homologous_temperature"],
            res_cold["results"]["homologous_temperature"],
        )

    def test_weibull_reliability_estimation(self):
        lifetimes = [120.0, 145.0, 160.0, 180.0, 210.0, 230.0, 275.0]
        res = MetallurgyService.analyze_tool_reliability(lifetimes)

        self.assertEqual(res.get("status"), "success")
        self.assertEqual(res.get("model"), "weibull_reliability")
        results = res.get("results", {})
        self.assertGreater(results["beta_shape"], 1.0)
        self.assertGreater(results["eta_scale"], 100.0)
        self.assertGreater(results["r_squared"], 0.90)
        self.assertLess(results["b10_life"], results["b50_median_life"])
        self.assertLess(results["b50_median_life"], results["eta_scale"])
        self.assertEqual(results["failure_mechanism"], "Wear-Out / Steady Degradation")

    def test_weibull_insufficient_data(self):
        res = MetallurgyService.analyze_tool_reliability([150.0, 200.0])
        self.assertEqual(res.get("status"), "error")
        self.assertIn("At least 3 positive lifetime", res.get("message", ""))
