module MetallurgyAnalytics

include("json_utils.jl")
include("archard_wear.jl")
include("johnson_cook.jl")
include("weibull_reliability.jl")

using .JSONUtils
using .ArchardWear
using .JohnsonCook
using .WeibullReliability

export analyze_archard, analyze_johnson_cook, analyze_weibull, process_json_request

function analyze_archard(data::Dict{String, Any})::Dict{String, Any}
    tonnage_raw = get(data, "tonnage", Any[])
    wear_raw = get(data, "wear_um", Any[])
    tol_raw = get(data, "tolerance_um", 8.0)

    tonnage = Float64[Float64(x) for x in tonnage_raw]
    wear_um = Float64[Float64(x) for x in wear_raw]
    tol = Float64(tol_raw)

    res = fit_archard_wear(tonnage, wear_um, tol)

    return Dict{String, Any}(
        "status" => "success",
        "model" => "archard_wear",
        "results" => Dict{String, Any}(
            "a_coeff" => round(res.a_coeff, digits=6),
            "b_exp" => round(res.b_exp, digits=4),
            "r_squared" => round(res.r_squared, digits=4),
            "rmse_um" => round(res.rmse, digits=4),
            "wear_regime" => res.wear_regime,
            "predicted_tonnage_limit" => round(res.predicted_tonnage_limit, digits=1),
            "remaining_tonnage" => round(res.remaining_tonnage, digits=1),
            "life_consumed_percent" => round(res.life_consumed_percent, digits=2)
        )
    )
end

function analyze_johnson_cook(data::Dict{String, Any})::Dict{String, Any}
    material = string(get(data, "material", "copper"))
    true_strain = Float64(get(data, "strain", 0.35))
    strain_rate = Float64(get(data, "strain_rate", 1.0))
    temp_c = Float64(get(data, "temperature_c", 20.0))

    params = get_material_params(material)
    res = compute_flow_stress(params, true_strain, strain_rate, temp_c)

    return Dict{String, Any}(
        "status" => "success",
        "model" => "johnson_cook",
        "material" => params.name,
        "results" => Dict{String, Any}(
            "flow_stress_mpa" => round(res.flow_stress_mpa, digits=2),
            "static_stress_mpa" => round(res.static_stress_mpa, digits=2),
            "strain_rate_enhancement_factor" => round(res.strain_rate_factor, digits=4),
            "thermal_softening_factor" => round(res.thermal_softening_factor, digits=4),
            "homologous_temperature" => round(res.homologous_temp, digits=4),
            "adiabatic_temp_rise_c" => round(res.adiabatic_temp_rise_c, digits=1)
        )
    )
end

function analyze_weibull(data::Dict{String, Any})::Dict{String, Any}
    lifetimes_raw = get(data, "lifetimes", Any[])
    lifetimes = Float64[Float64(x) for x in lifetimes_raw]

    res = fit_weibull(lifetimes)

    return Dict{String, Any}(
        "status" => "success",
        "model" => "weibull_reliability",
        "results" => Dict{String, Any}(
            "beta_shape" => round(res.beta_shape, digits=4),
            "eta_scale" => round(res.eta_scale, digits=2),
            "r_squared" => round(res.r_squared, digits=4),
            "b10_life" => round(res.b10_life, digits=1),
            "b50_median_life" => round(res.b50_median_life, digits=1),
            "mttc_mean_life" => round(res.mttc_mean_life, digits=1),
            "failure_mechanism" => res.failure_mechanism
        )
    )
end

function process_json_request(json_str::AbstractString)::String
    try
        req = parse_json(json_str)
        mode = get(req, "mode", "")
        data = get(req, "data", Dict{String, Any}())

        res = if mode == "archard"
            analyze_archard(data)
        elseif mode == "johnson_cook"
            analyze_johnson_cook(data)
        elseif mode == "weibull"
            analyze_weibull(data)
        else
            Dict{String, Any}(
                "status" => "error",
                "message" => "Unknown analysis mode: '$mode'. Supported: 'archard', 'johnson_cook', 'weibull'"
            )
        end
        return to_json(res)
    catch err
        err_res = Dict{String, Any}(
            "status" => "error",
            "message" => string(err)
        )
        return to_json(err_res)
    end
end

end # module
