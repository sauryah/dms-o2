use std::f64::consts::PI;
use serde::{Deserialize, Serialize};
use crate::materials::{MaterialProperties, MaterialType};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum DefectRisk {
    Safe,
    Warning,
    CriticalBurstRisk,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PassPhysicsResult {
    pub d_in_mm: f64,
    pub d_out_mm: f64,
    pub area_in_mm2: f64,
    pub area_out_mm2: f64,
    pub area_reduction_percent: f64,
    pub elongation_percent: f64,
    pub true_strain_epsilon: f64,
    pub flow_stress_mpa: f64,
    pub redundant_work_phi: f64,
    pub drawing_stress_sigma_d_mpa: f64,
    pub drawing_force_n: f64,
    pub drawing_power_kw: f64,
    pub delta_param: f64,
    pub central_burst_risk: DefectRisk,
    pub adiabatic_temp_rise_c: f64,
    pub friction_temp_rise_c: f64,
    pub total_exit_temp_c: f64,
}

pub fn calculate_area_mm2(d_mm: f64) -> f64 {
    (PI * d_mm * d_mm) / 4.0
}

pub fn calculate_true_strain(d_in: f64, d_out: f64) -> f64 {
    if d_out <= 0.0 || d_in <= d_out {
        return 0.0;
    }
    2.0 * (d_in / d_out).ln()
}

pub fn calculate_area_reduction_fraction(d_in: f64, d_out: f64) -> f64 {
    if d_in <= 0.0 || d_out >= d_in {
        return 0.0;
    }
    1.0 - (d_out * d_out) / (d_in * d_in)
}

pub fn calculate_elongation_percent(d_in: f64, d_out: f64) -> f64 {
    if d_out <= 0.0 {
        return 0.0;
    }
    ((d_in * d_in) / (d_out * d_out) - 1.0) * 100.0
}

/// Ludwik-Hollomon constitutive flow stress: sigma = (K * eps^n) / (n + 1)
pub fn calculate_flow_stress(mat: &MaterialProperties, epsilon: f64) -> f64 {
    let eps_safe = epsilon.max(0.001);
    let k = mat.strength_coefficient_k_mpa;
    let n = mat.hardening_exponent_n;
    (k * eps_safe.powf(n)) / (n + 1.0)
}

/// Avitzur redundant work factor: phi = 0.88 + 0.12 * (2 * alpha / r) * (1 - r)
pub fn calculate_redundant_work_phi(alpha_rad_half: f64, r_fraction: f64) -> f64 {
    let r_safe = r_fraction.clamp(0.01, 0.99);
    0.88 + 0.12 * ((alpha_rad_half * 2.0) / r_safe) * (1.0 - r_safe)
}

/// Siebel/Sachs drawing stress: sigma_d = sigma_flow * phi * epsilon * (1 + mu / tan(alpha))
pub fn calculate_drawing_stress(
    mat: &MaterialProperties,
    d_in: f64,
    d_out: f64,
    alpha_deg_half: f64,
    friction_mu: f64,
) -> f64 {
    let eps = calculate_true_strain(d_in, d_out);
    let r_frac = calculate_area_reduction_fraction(d_in, d_out);
    let alpha_rad = (alpha_deg_half.to_radians()).max(0.01);
    let sigma_flow = calculate_flow_stress(mat, eps);
    let phi = calculate_redundant_work_phi(alpha_rad, r_frac);
    let mu = if friction_mu > 0.0 { friction_mu } else { mat.default_friction_mu };

    sigma_flow * phi * eps * (1.0 + mu / alpha_rad.tan())
}

/// Avitzur central burst criterion: Delta = alpha / sqrt(r)
/// Central burst chevron defect occurs when Delta > 2.5 - 3.0 (high semi-angle + small reduction)
pub fn evaluate_central_burst(alpha_deg_half: f64, r_fraction: f64) -> (f64, DefectRisk) {
    let r_safe = r_fraction.max(0.001);
    let alpha_rad = alpha_deg_half.to_radians();
    let delta = alpha_rad / r_safe.sqrt();

    let risk = if delta > 2.8 || alpha_deg_half > 20.0 {
        DefectRisk::CriticalBurstRisk
    } else if delta > 1.8 || alpha_deg_half > 15.0 {
        DefectRisk::Warning
    } else {
        DefectRisk::Safe
    };

    (delta, risk)
}

/// Computes complete pass physics including thermal advection and power
pub fn compute_pass_physics(
    d_in: f64,
    d_out: f64,
    approach_angle_2alpha_deg: f64,
    friction_mu: f64,
    material_type: MaterialType,
    wire_speed_mpm: f64,
) -> PassPhysicsResult {
    let mat = material_type.properties();
    let alpha_half_deg = approach_angle_2alpha_deg / 2.0;
    let a_in = calculate_area_mm2(d_in);
    let a_out = calculate_area_mm2(d_out);
    let r_frac = calculate_area_reduction_fraction(d_in, d_out);
    let r_pct = r_frac * 100.0;
    let elong_pct = calculate_elongation_percent(d_in, d_out);
    let eps = calculate_true_strain(d_in, d_out);

    let sigma_flow = calculate_flow_stress(&mat, eps);
    let alpha_rad = (alpha_half_deg.to_radians()).max(0.01);
    let phi = calculate_redundant_work_phi(alpha_rad, r_frac);
    let sigma_d = calculate_drawing_stress(&mat, d_in, d_out, alpha_half_deg, friction_mu);

    let force_n = sigma_d * a_out;
    let speed_m_s = wire_speed_mpm.max(10.0) / 60.0;
    let power_kw = (force_n * speed_m_s) / 1000.0;

    let (delta, burst_risk) = evaluate_central_burst(alpha_half_deg, r_frac);

    // Taylor-Quinney conversion: ~90% of plastic work converted to heat
    // Delta T = (beta * sigma_d * eps) / (rho * cp) * 1e6
    let beta = 0.90;
    let adiabatic_temp_rise = (beta * sigma_d * eps) / (mat.density_kg_m3 * mat.specific_heat_j_kg_k) * 1.0e6;

    // Contact shear friction heating
    let mu = if friction_mu > 0.0 { friction_mu } else { mat.default_friction_mu };
    let friction_temp_rise = (mu * sigma_d * 0.45 * eps) / (mat.density_kg_m3 * mat.specific_heat_j_kg_k) * 1.0e6;

    let ambient_temp = 25.0;
    let total_exit_temp = ambient_temp + adiabatic_temp_rise + (friction_temp_rise * 0.6);

    PassPhysicsResult {
        d_in_mm: d_in,
        d_out_mm: d_out,
        area_in_mm2: a_in,
        area_out_mm2: a_out,
        area_reduction_percent: r_pct,
        elongation_percent: elong_pct,
        true_strain_epsilon: eps,
        flow_stress_mpa: sigma_flow,
        redundant_work_phi: phi,
        drawing_stress_sigma_d_mpa: sigma_d,
        drawing_force_n: force_n,
        drawing_power_kw: power_kw,
        delta_param: delta,
        central_burst_risk: burst_risk,
        adiabatic_temp_rise_c: adiabatic_temp_rise,
        friction_temp_rise_c: friction_temp_rise,
        total_exit_temp_c: total_exit_temp,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_area_reduction_and_strain() {
        let d_in = 1.0;
        let d_out = 0.8;
        let r = calculate_area_reduction_fraction(d_in, d_out);
        assert!((r - 0.36).abs() < 1e-4);

        let eps = calculate_true_strain(d_in, d_out);
        assert!((eps - 0.4462).abs() < 1e-3);
    }

    #[test]
    fn test_flow_stress_copper() {
        let mat = MaterialType::Copper.properties();
        let eps = 0.4462;
        let flow = calculate_flow_stress(&mat, eps);
        assert!(flow > 100.0 && flow < 400.0);
    }

    #[test]
    fn test_drawing_stress_positive() {
        let mat = MaterialType::Copper.properties();
        let sigma_d = calculate_drawing_stress(&mat, 1.0, 0.85, 8.0, 0.06);
        assert!(sigma_d > 0.0);
    }

    #[test]
    fn test_burst_risk_detection() {
        // High angle + small reduction -> large Delta -> Critical Burst Risk
        let (_, risk) = evaluate_central_burst(20.0, 0.05);
        assert_eq!(risk, DefectRisk::CriticalBurstRisk);
    }
}
