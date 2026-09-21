using Test

include("../src/MetallurgyAnalytics.jl")
using .MetallurgyAnalytics
using .MetallurgyAnalytics.JSONUtils
using .MetallurgyAnalytics.ArchardWear
using .MetallurgyAnalytics.JohnsonCook
using .MetallurgyAnalytics.WeibullReliability

@testset "DMS-O2 Metallurgy Analytics Suite" begin

    @testset "JSON Parsing & Serialization" begin
        raw = "{\"material\": \"copper\", \"values\": [1.2, 3.4, 5.6], \"active\": true, \"count\": 42}"
        parsed = parse_json(raw)
        @test parsed["material"] == "copper"
        @test parsed["values"] == [1.2, 3.4, 5.6]
        @test parsed["active"] == true
        @test parsed["count"] == 42

        serialized = to_json(parsed)
        reparsed = parse_json(serialized)
        @test reparsed["material"] == parsed["material"]
        @test reparsed["values"] == parsed["values"]
        @test reparsed["active"] == parsed["active"]
        @test reparsed["count"] == parsed["count"]
    end

    @testset "Archard Power-Law Die Wear Model" begin
        # Synthetic steady-state wear data: W(t) ≈ 0.15 * t^0.75
        tonnage = [10.0, 25.0, 50.0, 75.0, 100.0, 150.0]
        wear_um = [0.84, 1.67, 2.82, 3.82, 4.74, 6.42]

        res = fit_archard_wear(tonnage, wear_um, 8.0)
        @test res.r_squared > 0.98
        @test res.b_exp > 0.65 && res.b_exp < 0.85
        @test res.predicted_tonnage_limit > 150.0
        @test res.remaining_tonnage > 0.0
        @test res.life_consumed_percent > 0.0 && res.life_consumed_percent < 100.0
        @test res.wear_regime in ["Running-in Attenuation", "Steady-State Abrasive"]

        # Prediction function
        w_pred = predict_wear(res.a_coeff, res.b_exp, 100.0)
        @test isapprox(w_pred, 4.74, atol=0.5)

        # Edge cases
        @test_throws ErrorException fit_archard_wear([10.0], [1.0])
    end

    @testset "Johnson-Cook Constitutive Plasticity Model" begin
        cu = get_material_params("copper")
        @test cu.name == "Copper (Cu-ETP)"
        @test cu.yield_A_mpa == 90.0

        # Flow stress at quasi-static ambient conditions (ε = 0.35, ε̇ = 1 s⁻¹, T = 20°C)
        res_ambient = compute_flow_stress(cu, 0.35, 1.0, 20.0)
        @test res_ambient.flow_stress_mpa > 250.0
        @test res_ambient.thermal_softening_factor ≈ 1.0
        @test res_ambient.strain_rate_factor ≈ 1.0
        @test res_ambient.homologous_temp == 0.0

        # Flow stress at high drawing speed (ε̇ = 1000 s⁻¹)
        res_fast = compute_flow_stress(cu, 0.35, 1000.0, 20.0)
        @test res_fast.flow_stress_mpa > res_ambient.flow_stress_mpa
        @test res_fast.strain_rate_factor > 1.10

        # Thermal softening at elevated temperature (T = 300°C)
        res_hot = compute_flow_stress(cu, 0.35, 1.0, 300.0)
        @test res_hot.flow_stress_mpa < res_ambient.flow_stress_mpa
        @test res_hot.thermal_softening_factor < 1.0
        @test res_hot.homologous_temp > 0.20

        # Effective drawing strain rate calculation
        # Wire drawing at 900 m/min from 2.0 mm to 1.6 mm with 16° cone
        eps_dot = compute_drawing_strain_rate(900.0, 2.0, 1.6, 16.0)
        @test eps_dot > 5000.0 # High strain rate in industrial wire drawing
    end

    @testset "Weibull Tool-Life Reliability Model" begin
        # Lifetimes of 8 drawing dies before reaching terminal wear (hours)
        lifetimes = [410.0, 520.0, 640.0, 710.0, 830.0, 920.0, 1040.0, 1180.0]

        res = fit_weibull(lifetimes)
        @test res.r_squared > 0.95
        @test res.beta_shape > 1.5 # β > 1 indicates wear-out degradation
        @test res.failure_mechanism == "Wear-Out / Steady Degradation"
        @test res.b10_life < res.b50_median_life
        @test res.b50_median_life < res.eta_scale
        @test res.mttc_mean_life > 600.0

        # Reliability and hazard calculations
        @test isapprox(weibull_reliability(res.beta_shape, res.eta_scale, 0.0), 1.0)
        @test weibull_reliability(res.beta_shape, res.eta_scale, res.eta_scale) ≈ exp(-1.0)
        @test weibull_hazard(res.beta_shape, res.eta_scale, 500.0) > 0.0
    end

    @testset "End-to-End JSON Pipeline" begin
        # 1. Archard Wear JSON
        req_archard = """
        {
            "mode": "archard",
            "data": {
                "tonnage": [15.0, 35.0, 70.0, 110.0],
                "wear_um": [1.1, 1.9, 3.2, 4.4],
                "tolerance_um": 7.5
            }
        }
        """
        resp_archard_str = process_json_request(req_archard)
        resp_archard = parse_json(resp_archard_str)
        @test resp_archard["status"] == "success"
        @test resp_archard["model"] == "archard_wear"
        @test haskey(resp_archard["results"], "predicted_tonnage_limit")
        @test haskey(resp_archard["results"], "remaining_tonnage")

        # 2. Johnson-Cook JSON
        req_jc = """
        {
            "mode": "johnson_cook",
            "data": {
                "material": "copper",
                "strain": 0.40,
                "strain_rate": 500.0,
                "temperature_c": 85.0
            }
        }
        """
        resp_jc_str = process_json_request(req_jc)
        resp_jc = parse_json(resp_jc_str)
        @test resp_jc["status"] == "success"
        @test resp_jc["model"] == "johnson_cook"
        @test resp_jc["results"]["flow_stress_mpa"] > 200.0

        # 3. Weibull JSON
        req_weibull = """
        {
            "mode": "weibull",
            "data": {
                "lifetimes": [350.0, 480.0, 590.0, 720.0, 860.0]
            }
        }
        """
        resp_weibull_str = process_json_request(req_weibull)
        resp_weibull = parse_json(resp_weibull_str)
        @test resp_weibull["status"] == "success"
        @test resp_weibull["model"] == "weibull_reliability"
        @test resp_weibull["results"]["b10_life"] > 0.0

        # 4. Error handling
        req_bad = "{\"mode\": \"invalid_mode\"}"
        resp_bad = parse_json(process_json_request(req_bad))
        @test resp_bad["status"] == "error"
    end

end
