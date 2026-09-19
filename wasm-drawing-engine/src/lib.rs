pub mod materials;
pub mod physics;
pub mod fea_mesh;

use wasm_bindgen::prelude::*;
use materials::MaterialType;
use physics::compute_pass_physics;
use fea_mesh::{generate_fea_mesh, FeaMeshConfig, FeaMeshBuffer, NODE_STRIDE};

#[wasm_bindgen]
pub struct DrawingEngine {
    mesh_buffer: Option<FeaMeshBuffer>,
}

#[wasm_bindgen]
impl DrawingEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self { mesh_buffer: None }
    }

    /// Computes full FEA mesh and keeps nodal buffer in Wasm linear memory
    pub fn compute_mesh(
        &mut self,
        d_in_mm: f64,
        d_out_mm: f64,
        approach_angle_2alpha_deg: f64,
        bearing_length_lb_ratio_pct: f64,
        back_relief_2beta_deg: f64,
        friction_mu: f64,
        material_str: &str,
        wire_speed_mpm: f64,
        num_axial_slices: usize,
        num_radial_rings: usize,
        num_angular_segments: usize,
    ) {
        let mat = MaterialType::from_str_case_insensitive(material_str);
        let cfg = FeaMeshConfig {
            d_in_mm,
            d_out_mm,
            approach_angle_2alpha_deg,
            bearing_length_lb_ratio_pct,
            back_relief_2beta_deg,
            friction_mu,
            material_type: mat,
            wire_speed_mpm,
            num_axial_slices: num_axial_slices.max(4),
            num_radial_rings: num_radial_rings.max(1),
            num_angular_segments: num_angular_segments.max(4),
        };

        let buffer = generate_fea_mesh(&cfg);
        self.mesh_buffer = Some(buffer);
    }

    /// Direct pointer to flat f32 linear buffer for zero-copy JS Float32Array consumption
    pub fn get_mesh_buffer_ptr(&self) -> *const f32 {
        match &self.mesh_buffer {
            Some(b) => b.data.as_ptr(),
            None => std::ptr::null(),
        }
    }

    pub fn get_mesh_buffer_len(&self) -> usize {
        match &self.mesh_buffer {
            Some(b) => b.data.len(),
            None => 0,
        }
    }

    pub fn get_node_count(&self) -> usize {
        match &self.mesh_buffer {
            Some(b) => b.node_count,
            None => 0,
        }
    }

    pub fn get_node_stride(&self) -> usize {
        NODE_STRIDE
    }

    pub fn get_max_von_mises(&self) -> f32 {
        match &self.mesh_buffer {
            Some(b) => b.max_von_mises,
            None => 0.0,
        }
    }

    pub fn get_max_temperature(&self) -> f32 {
        match &self.mesh_buffer {
            Some(b) => b.max_temperature,
            None => 25.0,
        }
    }
}

/// Compute pass drawing physics and serialize directly to JsValue
#[wasm_bindgen]
pub fn compute_pass_physics_js(
    d_in_mm: f64,
    d_out_mm: f64,
    approach_angle_2alpha_deg: f64,
    friction_mu: f64,
    material_str: &str,
    wire_speed_mpm: f64,
) -> Result<JsValue, JsValue> {
    let mat = MaterialType::from_str_case_insensitive(material_str);
    let result = compute_pass_physics(
        d_in_mm,
        d_out_mm,
        approach_angle_2alpha_deg,
        friction_mu,
        mat,
        wire_speed_mpm,
    );

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// Evaluate Avitzur central burst hazard parameter Delta
#[wasm_bindgen]
pub fn evaluate_central_burst_js(alpha_deg_half: f64, r_fraction: f64) -> Result<JsValue, JsValue> {
    let (delta, risk) = physics::evaluate_central_burst(alpha_deg_half, r_fraction);
    let tuple = (delta, risk);
    serde_wasm_bindgen::to_value(&tuple)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}
