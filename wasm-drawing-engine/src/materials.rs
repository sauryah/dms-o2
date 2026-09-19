use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum MaterialType {
    Copper,
    HighCarbonSteel,
    Aluminum,
    Brass,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct MaterialProperties {
    pub name: &'static str,
    pub density_kg_m3: f64,
    pub specific_heat_j_kg_k: f64,
    pub thermal_conductivity_w_m_k: f64,
    pub strength_coefficient_k_mpa: f64,
    pub hardening_exponent_n: f64,
    pub elastic_modulus_gpa: f64,
    pub poissons_ratio: f64,
    pub default_friction_mu: f64,
}

impl MaterialType {
    pub fn from_str_case_insensitive(s: &str) -> Self {
        match s.trim().to_lowercase().as_str() {
            "steel" | "high-carbon-steel" | "carbon_steel" => MaterialType::HighCarbonSteel,
            "aluminum" | "al" | "aluminium" => MaterialType::Aluminum,
            "brass" | "cuzn30" => MaterialType::Brass,
            _ => MaterialType::Copper,
        }
    }

    pub fn properties(&self) -> MaterialProperties {
        match self {
            MaterialType::Copper => MaterialProperties {
                name: "Electrolytic Copper (Cu-ETP)",
                density_kg_m3: 8960.0,
                specific_heat_j_kg_k: 385.0,
                thermal_conductivity_w_m_k: 390.0,
                strength_coefficient_k_mpa: 480.0,
                hardening_exponent_n: 0.28,
                elastic_modulus_gpa: 117.0,
                poissons_ratio: 0.34,
                default_friction_mu: 0.06,
            },
            MaterialType::HighCarbonSteel => MaterialProperties {
                name: "High-Carbon Steel (AISI 1070)",
                density_kg_m3: 7850.0,
                specific_heat_j_kg_k: 486.0,
                thermal_conductivity_w_m_k: 45.0,
                strength_coefficient_k_mpa: 1150.0,
                hardening_exponent_n: 0.15,
                elastic_modulus_gpa: 210.0,
                poissons_ratio: 0.29,
                default_friction_mu: 0.08,
            },
            MaterialType::Aluminum => MaterialProperties {
                name: "EC Grade Aluminum (Al 1350)",
                density_kg_m3: 2705.0,
                specific_heat_j_kg_k: 900.0,
                thermal_conductivity_w_m_k: 230.0,
                strength_coefficient_k_mpa: 180.0,
                hardening_exponent_n: 0.22,
                elastic_modulus_gpa: 69.0,
                poissons_ratio: 0.33,
                default_friction_mu: 0.05,
            },
            MaterialType::Brass => MaterialProperties {
                name: "Cartridge Brass (CuZn30)",
                density_kg_m3: 8530.0,
                specific_heat_j_kg_k: 377.0,
                thermal_conductivity_w_m_k: 115.0,
                strength_coefficient_k_mpa: 620.0,
                hardening_exponent_n: 0.40,
                elastic_modulus_gpa: 110.0,
                poissons_ratio: 0.35,
                default_friction_mu: 0.07,
            },
        }
    }
}
