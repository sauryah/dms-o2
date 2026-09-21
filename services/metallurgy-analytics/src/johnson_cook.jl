module JohnsonCook

export MaterialParams, get_material_params, compute_flow_stress, compute_drawing_strain_rate

struct MaterialParams
    name::String
    yield_A_mpa::Float64       # Initial quasi-static yield stress A (MPa)
    hardening_B_mpa::Float64   # Strain hardening coefficient B (MPa)
    exponent_n::Float64        # Work hardening exponent n
    strain_rate_C::Float64     # Strain rate sensitivity coefficient C
    thermal_softening_m::Float64 # Thermal softening exponent m
    melt_temp_c::Float64       # Melting temperature (°C)
    ref_temp_c::Float64        # Reference ambient temperature (°C, standard 20°C)
    ref_strain_rate::Float64   # Reference strain rate (s⁻¹, standard 1.0)
    density_kg_m3::Float64     # Density (kg/m³)
    specific_heat_j_kg_k::Float64 # Specific heat cp (J/(kg·K))
end

const MATERIALS = Dict{String, MaterialParams}(
    "copper" => MaterialParams("Copper (Cu-ETP)", 90.0, 292.0, 0.31, 0.025, 1.09, 1085.0, 20.0, 1.0, 8960.0, 385.0),
    "steel" => MaterialParams("High-Carbon Steel (AISI 1070)", 490.0, 600.0, 0.26, 0.014, 1.03, 1450.0, 20.0, 1.0, 7850.0, 486.0),
    "aluminum" => MaterialParams("Electrical Aluminum (Al 1350)", 65.0, 160.0, 0.28, 0.018, 1.35, 660.0, 20.0, 1.0, 2700.0, 900.0),
    "brass" => MaterialParams("Cartridge Brass (CuZn30)", 112.0, 505.0, 0.42, 0.009, 1.68, 950.0, 20.0, 1.0, 8530.0, 380.0)
)

"""
    get_material_params(name::String)::MaterialParams

Retrieves Johnson-Cook constitutive constants for a wire alloy.
"""
function get_material_params(name::String)::MaterialParams
    key = lowercase(strip(name))
    if haskey(MATERIALS, key)
        return MATERIALS[key]
    end
    # Default fallback to Copper
    return MATERIALS["copper"]
end

struct JohnsonCookResult
    flow_stress_mpa::Float64
    static_stress_mpa::Float64
    strain_rate_factor::Float64
    thermal_softening_factor::Float64
    homologous_temp::Float64
    adiabatic_temp_rise_c::Float64
end

"""
    compute_flow_stress(params::MaterialParams, true_strain::Float64, strain_rate_s1::Float64=1.0, temp_c::Float64=20.0)::JohnsonCookResult

Calculates high-strain-rate, temperature-dependent flow stress using the Johnson-Cook constitutive relation:
σ = (A + B*ε^n) * (1 + C*ln(ε̇/ε̇₀)) * (1 - (T*)^m)
"""
function compute_flow_stress(
    params::MaterialParams,
    true_strain::Float64,
    strain_rate_s1::Float64=1.0,
    temp_c::Float64=20.0
)::JohnsonCookResult
    eps = max(0.0001, true_strain)
    eps_dot = max(params.ref_strain_rate, strain_rate_s1)

    # 1. Strain hardening term: (A + B * ε^n)
    static_term = params.yield_A_mpa + params.hardening_B_mpa * (eps ^ params.exponent_n)

    # 2. Viscoplastic strain rate enhancement term: (1 + C * ln(ε̇ / ε̇₀))
    rate_ratio = eps_dot / params.ref_strain_rate
    rate_term = 1.0 + params.strain_rate_C * log(rate_ratio)

    # 3. Thermal softening term: (1 - (T*)^m)
    t_star = if temp_c <= params.ref_temp_c
        0.0
    elseif temp_c >= params.melt_temp_c
        1.0
    else
        (temp_c - params.ref_temp_c) / (params.melt_temp_c - params.ref_temp_c)
    end

    thermal_term = max(0.0, 1.0 - (t_star ^ params.thermal_softening_m))

    # Overall flow stress
    flow_stress = static_term * rate_term * thermal_term

    # Taylor-Quinney adiabatic temperature rise estimate: ΔT = (0.90 * σ * ε) / (ρ * cp)
    # Conversion factor from MPa * mm³ to Joules is 1e-6, yielding direct °C rise
    taylor_quinney_beta = 0.90
    plastic_work_energy_density_j_m3 = (flow_stress * 1e6) * eps
    adiabatic_rise = (taylor_quinney_beta * plastic_work_energy_density_j_m3) / (params.density_kg_m3 * params.specific_heat_j_kg_k)

    return JohnsonCookResult(
        flow_stress,
        static_term,
        rate_term,
        thermal_term,
        t_star,
        adiabatic_rise
    )
end

"""
    compute_drawing_strain_rate(speed_mpm::Float64, d_in_mm::Float64, d_out_mm::Float64, approach_angle_deg::Float64)::Float64

Estimates average effective plastic strain rate in the die reduction cone:
ε̇_avg ≈ (6 * v_wire * tan(α)) / (d_in + d_out)
"""
function compute_drawing_strain_rate(speed_mpm::Float64, d_in_mm::Float64, d_out_mm::Float64, approach_angle_deg::Float64)::Float64
    v_m_s = (speed_mpm / 60.0) # convert m/min to m/s
    alpha_rad = (approach_angle_deg / 2.0) * (pi / 180.0)
    d_mean_m = ((d_in_mm + d_out_mm) / 2.0) * 1e-3 # convert mm to m

    if d_mean_m <= 0.0 return 1.0 end
    return (6.0 * v_m_s * tan(alpha_rad)) / d_mean_m
end

end # module
