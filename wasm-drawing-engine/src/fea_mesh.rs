use std::f64::consts::PI;
use crate::materials::MaterialType;
use crate::physics::{calculate_drawing_stress, calculate_true_strain};

pub const NODE_STRIDE: usize = 7;

#[derive(Debug, Clone)]
pub struct FeaMeshConfig {
    pub d_in_mm: f64,
    pub d_out_mm: f64,
    pub approach_angle_2alpha_deg: f64,
    pub bearing_length_lb_ratio_pct: f64, // e.g. 35% of d_out
    pub back_relief_2beta_deg: f64,       // e.g. 30 deg
    pub friction_mu: f64,
    pub material_type: MaterialType,
    pub wire_speed_mpm: f64,
    pub num_axial_slices: usize,          // e.g. 40
    pub num_radial_rings: usize,          // e.g. 4
    pub num_angular_segments: usize,      // e.g. 16
}

impl Default for FeaMeshConfig {
    fn default() -> Self {
        Self {
            d_in_mm: 1.0,
            d_out_mm: 0.8,
            approach_angle_2alpha_deg: 16.0,
            bearing_length_lb_ratio_pct: 35.0,
            back_relief_2beta_deg: 30.0,
            friction_mu: 0.06,
            material_type: MaterialType::Copper,
            wire_speed_mpm: 600.0,
            num_axial_slices: 36,
            num_radial_rings: 4,
            num_angular_segments: 16,
        }
    }
}

pub struct FeaMeshBuffer {
    pub data: Vec<f32>,
    pub node_count: usize,
    pub max_von_mises: f32,
    pub max_temperature: f32,
}

pub fn generate_fea_mesh(cfg: &FeaMeshConfig) -> FeaMeshBuffer {
    let mat = cfg.material_type.properties();
    let r_in = cfg.d_in_mm / 2.0;
    let r_out = cfg.d_out_mm / 2.0;
    let alpha_half_rad = (cfg.approach_angle_2alpha_deg / 2.0).to_radians().max(0.01);
    let beta_half_rad = (cfg.back_relief_2beta_deg / 2.0).to_radians().max(0.01);

    // Die Zone Dimensions (mm)
    let r_bell = 0.5; // Bell entrance radius curvature
    let cone_len = ((r_in - r_out) / alpha_half_rad.tan()).max(0.2);
    let bearing_len = (cfg.bearing_length_lb_ratio_pct / 100.0) * cfg.d_out_mm;
    let relief_len = ((r_in - r_out) / beta_half_rad.tan()).clamp(0.2, 5.0);

    let x_entrance = -cone_len - r_bell - 1.0;
    let x_bell_start = -cone_len - r_bell;
    let x_cone_start = -cone_len;
    let x_cone_end = 0.0;
    let x_bear_end = bearing_len;
    let x_relief_end = bearing_len + relief_len;
    let x_exit = x_relief_end + 1.0;

    let total_len = x_exit - x_entrance;
    let total_eps = calculate_true_strain(cfg.d_in_mm, cfg.d_out_mm);
    let sigma_d = calculate_drawing_stress(
        &mat,
        cfg.d_in_mm,
        cfg.d_out_mm,
        cfg.approach_angle_2alpha_deg / 2.0,
        cfg.friction_mu,
    );

    let mut nodes: Vec<f32> = Vec::with_capacity(
        cfg.num_axial_slices * cfg.num_radial_rings * cfg.num_angular_segments * NODE_STRIDE,
    );

    let mut max_vm: f32 = 0.0;
    let mut max_temp: f32 = 25.0;

    let ambient_temp = 25.0;
    let adiabatic_scale = (0.90 * sigma_d * total_eps) / (mat.density_kg_m3 * mat.specific_heat_j_kg_k) * 1.0e6;

    for i in 0..cfg.num_axial_slices {
        let t_axial = i as f64 / (cfg.num_axial_slices - 1).max(1) as f64;
        let x = x_entrance + t_axial * total_len;

        // Determine current zone, local outer radius, strain and stress state
        let (zone_id, r_local, local_strain, axial_factor) = if x < x_bell_start {
            (0.0, r_in, 0.0, 0.20)
        } else if x < x_cone_start {
            let t = (x - x_bell_start) / (x_cone_start - x_bell_start);
            let r = r_in - (1.0 - (1.0 - t * t).sqrt().max(0.0)) * 0.05;
            (1.0, r, total_eps * 0.05 * t, 0.30 + 0.15 * t)
        } else if x <= x_cone_end {
            let t = (x - x_cone_start) / (x_cone_end - x_cone_start);
            let r = r_in - t * (r_in - r_out);
            let eps_local = total_eps * t.powf(0.85);
            (2.0, r, eps_local, 0.45 + 0.45 * t.powf(0.7))
        } else if x <= x_bear_end {
            let t = (x - x_cone_end) / bearing_len.max(0.001);
            (3.0, r_out, total_eps, 0.90 + 0.08 * t)
        } else if x <= x_relief_end {
            let t = (x - x_bear_end) / relief_len.max(0.001);
            let r = r_out + t * (r_in - r_out) * 0.5;
            (4.0, r, total_eps, 0.35 * (1.0 - 0.5 * t))
        } else {
            (5.0, r_out, total_eps, 0.25)
        };

        // Bulk adiabatic temperature rise
        let local_adiabatic_t = (local_strain / total_eps.max(0.001)) * adiabatic_scale;

        for j in 0..cfg.num_radial_rings {
            let r_frac = (j + 1) as f64 / cfg.num_radial_rings as f64;
            let current_r = r_local * r_frac;

            // Radial distribution: shear and friction intensify toward surface
            let surface_proximity = r_frac.powi(2);
            let shear_stress = if zone_id == 2.0 || zone_id == 3.0 {
                sigma_d * 0.25 * surface_proximity * cfg.friction_mu
            } else {
                0.0
            };

            let sigma_z = sigma_d * axial_factor * (0.8 + 0.2 * (1.0 - surface_proximity));
            let sigma_r = -sigma_d * 0.4 * surface_proximity;
            let sigma_theta = -sigma_d * 0.2 * surface_proximity;

            // von Mises formulation
            let vm_sq = 0.5 * (
                (sigma_z - sigma_r).powi(2) +
                (sigma_r - sigma_theta).powi(2) +
                (sigma_theta - sigma_z).powi(2)
            ) + 3.0 * shear_stress.powi(2);
            let von_mises = (vm_sq.max(0.0).sqrt()) as f32;

            // Boundary friction thermal layer
            let friction_t = if zone_id == 2.0 || zone_id == 3.0 {
                surface_proximity * 35.0 * (cfg.friction_mu / 0.06)
            } else {
                surface_proximity * 10.0
            };
            let node_temp = (ambient_temp + local_adiabatic_t + friction_t) as f32;

            if von_mises > max_vm {
                max_vm = von_mises;
            }
            if node_temp > max_temp {
                max_temp = node_temp;
            }

            for k in 0..cfg.num_angular_segments {
                let theta = (k as f64 / cfg.num_angular_segments as f64) * 2.0 * PI;
                let y = (current_r * theta.cos()) as f32;
                let z = (current_r * theta.sin()) as f32;

                nodes.push(x as f32);
                nodes.push(y);
                nodes.push(z);
                nodes.push(von_mises);
                nodes.push(node_temp);
                nodes.push(local_strain as f32);
                nodes.push(zone_id as f32);
            }
        }
    }

    let node_count = nodes.len() / NODE_STRIDE;

    FeaMeshBuffer {
        data: nodes,
        node_count,
        max_von_mises: max_vm,
        max_temperature: max_temp,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mesh_generation_stride_and_nodes() {
        let cfg = FeaMeshConfig {
            num_axial_slices: 10,
            num_radial_rings: 3,
            num_angular_segments: 8,
            ..Default::default()
        };

        let mesh = generate_fea_mesh(&cfg);
        let expected_nodes = 10 * 3 * 8;
        assert_eq!(mesh.node_count, expected_nodes);
        assert_eq!(mesh.data.len(), expected_nodes * NODE_STRIDE);
        assert!(mesh.max_von_mises > 0.0);
        assert!(mesh.max_temperature >= 25.0);
    }
}
