module WeibullReliability

using Statistics

export fit_weibull, weibull_reliability, weibull_hazard, compute_b_life

struct WeibullResult
    beta_shape::Float64        # Shape parameter β (>1 means wear-out degradation)
    eta_scale::Float64         # Scale parameter η (characteristic life)
    r_squared::Float64         # Goodness of fit
    b10_life::Float64          # B10 life (10% cumulative failure probability)
    b50_median_life::Float64   # Median life B50
    mttc_mean_life::Float64    # Mean Time To Change (expected life)
    failure_mechanism::String  # Infant mortality, Random, or Wear-out
end

# Fast Gamma function approximation for MTTC = η * Γ(1 + 1/β)
function gamma_approx(z::Float64)::Float64
    if z <= 0.0 return 1.0 end
    # Lanczos approximation (g=5, n=6)
    p = [
        1.000000000190015,
        76.18009172947146,
        -86.50532032941677,
        24.01409824083091,
        -1.231739572450155,
        0.001208650973866179,
        -0.000005395239384953
    ]
    x = z - 1.0
    tmp = x + 5.5
    tmp -= (x + 0.5) * log(tmp)
    ser = p[1]
    for j in 1:6
        ser += p[j+1] / (x + j)
    end
    return exp(-tmp + log(sqrt(2 * pi) * ser))
end

"""
    fit_weibull(lifetimes::Vector{Float64})::WeibullResult

Fits a 2-parameter Weibull distribution to empirical tool lifetimes (hours or tonnage)
using Benard's median rank regression.
"""
function fit_weibull(lifetimes::Vector{Float64})::WeibullResult
    clean_lifetimes = sort(filter(t -> t > 0.0, lifetimes))
    N = length(clean_lifetimes)
    if N < 3
        error("At least 3 valid positive lifetimes required for Weibull estimation")
    end

    # 1. Benard's median ranks: F_i = (i - 0.3) / (N + 0.4)
    x = log.(clean_lifetimes)
    y = zeros(Float64, N)
    for i in 1:N
        f_i = (i - 0.3) / (N + 0.4)
        y[i] = log(-log(1.0 - f_i))
    end

    mean_x = mean(x)
    mean_y = mean(y)

    ss_xx = sum((x .- mean_x).^2)
    ss_xy = sum((x .- mean_x) .* (y .- mean_y))

    if ss_xx == 0.0
        error("All lifetime data points are identical")
    end

    # Linearized Weibull: y = β * x - β * ln(η)
    beta = max(0.1, ss_xy / ss_xx)
    intercept = mean_y - beta * mean_x
    ln_eta = -intercept / beta
    eta = max(1.0, exp(ln_eta))

    # Fit quality R²
    y_pred = intercept .+ beta .* x
    ss_res = sum((y .- y_pred).^2)
    ss_tot = sum((y .- mean_y).^2)
    r2 = ss_tot > 0.0 ? max(0.0, min(1.0, 1.0 - (ss_res / ss_tot))) : 1.0

    # B10 life: F(t)=0.10 => t = η * (-ln(0.90))^(1/β)
    b10 = eta * ((-log(0.90)) ^ (1.0 / beta))

    # B50 median life: F(t)=0.50 => t = η * (ln(2))^(1/β)
    b50 = eta * (log(2.0) ^ (1.0 / beta))

    # MTTC: Mean time to change = η * Γ(1 + 1/β)
    mttc = eta * gamma_approx(1.0 + 1.0 / beta)

    # Classify failure mechanism based on shape parameter β
    mechanism = if beta < 0.9
        "Infant Mortality / Thermal Shock"
    elseif beta <= 1.2
        "Random / Stress Fluctuation"
    else
        "Wear-Out / Steady Degradation"
    end

    return WeibullResult(beta, eta, r2, b10, b50, mttc, mechanism)
end

"""
    weibull_reliability(beta::Float64, eta::Float64, t::Float64)::Float64

Computes survival probability R(t) = exp(-(t/η)^β).
"""
function weibull_reliability(beta::Float64, eta::Float64, t::Float64)::Float64
    if t <= 0.0 return 1.0 end
    return exp(-((t / eta) ^ beta))
end

"""
    weibull_hazard(beta::Float64, eta::Float64, t::Float64)::Float64

Computes instantaneous hazard rate h(t) = (β/η) * (t/η)^(β-1).
"""
function weibull_hazard(beta::Float64, eta::Float64, t::Float64)::Float64
    if t <= 0.0 return 0.0 end
    return (beta / eta) * ((t / eta) ^ (beta - 1.0))
end

"""
    compute_b_life(beta::Float64, eta::Float64, unreliability_pct::Float64)::Float64

Computes life corresponding to a given unreliability percentage (e.g. B10, B20).
"""
function compute_b_life(beta::Float64, eta::Float64, unreliability_pct::Float64)::Float64
    p = clamp(unreliability_pct / 100.0, 0.001, 0.999)
    return eta * ((-log(1.0 - p)) ^ (1.0 / beta))
end

end # module
