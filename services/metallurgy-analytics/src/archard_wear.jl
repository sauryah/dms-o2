module ArchardWear

using Statistics

export fit_archard_wear, predict_wear, forecast_remaining_tonnage

struct ArchardWearResult
    a_coeff::Float64
    b_exp::Float64
    r_squared::Float64
    rmse::Float64
    wear_regime::String
    predicted_tonnage_limit::Float64
    remaining_tonnage::Float64
    life_consumed_percent::Float64
end

"""
    fit_archard_wear(tonnage::Vector{Float64}, wear_um::Vector{Float64}, tolerance_um::Float64=8.0)

Fits power-law wear progression W(t) = a * t^b to empirical die wear data using
log-transformed least squares estimation.
"""
function fit_archard_wear(tonnage::Vector{Float64}, wear_um::Vector{Float64}, tolerance_um::Float64=8.0)::ArchardWearResult
    if length(tonnage) != length(wear_um)
        error("Tonnage and wear vectors must have identical length")
    end
    if length(tonnage) < 2
        error("At least 2 data points required for wear regression")
    end

    # Filter out non-positive entries for log transform
    valid_indices = findall(i -> tonnage[i] > 0.0 && wear_um[i] > 0.0, 1:length(tonnage))
    if length(valid_indices) < 2
        error("At least 2 positive data points required for log-transformed regression")
    end

    x = log.(tonnage[valid_indices])
    y = log.(wear_um[valid_indices])
    n = length(x)

    mean_x = mean(x)
    mean_y = mean(y)

    ss_xx = sum((x .- mean_x).^2)
    ss_xy = sum((x .- mean_x) .* (y .- mean_y))

    if ss_xx == 0.0
        error("Collinear or identical tonnage data points provided")
    end

    # ln(W) = ln(a) + b * ln(t)
    b = ss_xy / ss_xx
    ln_a = mean_y - b * mean_x
    a = exp(ln_a)

    # Calculate model fit quality (R² and RMSE)
    y_pred = ln_a .+ b .* x
    ss_res = sum((y .- y_pred).^2)
    ss_tot = sum((y .- mean_y).^2)
    r2 = ss_tot > 0 ? max(0.0, min(1.0, 1.0 - (ss_res / ss_tot))) : 1.0

    actual_wear = wear_um[valid_indices]
    model_wear = a .* (tonnage[valid_indices].^b)
    rmse = sqrt(mean((actual_wear .- model_wear).^2))

    # Determine industrial wear regime
    regime = if b < 0.75
        "Running-in Attenuation"
    elseif b <= 1.25
        "Steady-State Abrasive"
    else
        "Accelerated Thermal Breakdown"
    end

    # Predict remaining life
    t_limit = (tolerance_um / max(a, 1e-9))^(1.0 / max(b, 0.01))
    current_tonnage = maximum(tonnage[valid_indices])
    remaining = max(0.0, t_limit - current_tonnage)
    consumed_pct = min(100.0, max(0.0, (current_tonnage / max(t_limit, 1e-9)) * 100.0))

    return ArchardWearResult(a, b, r2, rmse, regime, t_limit, remaining, consumed_pct)
end

"""
    predict_wear(a::Float64, b::Float64, t::Float64)

Predicts die bore wear (in μm) for a given cumulative tonnage.
"""
function predict_wear(a::Float64, b::Float64, t::Float64)::Float64
    if t <= 0.0 return 0.0 end
    return a * (t^b)
end

"""
    forecast_remaining_tonnage(a::Float64, b::Float64, current_t::Float64, tolerance_um::Float64)

Calculates remaining tonnage before tolerance threshold is reached.
"""
function forecast_remaining_tonnage(a::Float64, b::Float64, current_t::Float64, tolerance_um::Float64)::Float64
    if a <= 0.0 || b <= 0.0 return 0.0 end
    t_limit = (tolerance_um / a)^(1.0 / b)
    return max(0.0, t_limit - current_t)
end

end # module
