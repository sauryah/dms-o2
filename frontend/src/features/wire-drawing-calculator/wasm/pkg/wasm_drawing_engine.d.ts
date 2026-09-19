/* tslint:disable */
/* eslint-disable */

export class DrawingEngine {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Computes full FEA mesh and keeps nodal buffer in Wasm linear memory
     */
    compute_mesh(d_in_mm: number, d_out_mm: number, approach_angle_2alpha_deg: number, bearing_length_lb_ratio_pct: number, back_relief_2beta_deg: number, friction_mu: number, material_str: string, wire_speed_mpm: number, num_axial_slices: number, num_radial_rings: number, num_angular_segments: number): void;
    get_max_temperature(): number;
    get_max_von_mises(): number;
    get_mesh_buffer_len(): number;
    /**
     * Direct pointer to flat f32 linear buffer for zero-copy JS Float32Array consumption
     */
    get_mesh_buffer_ptr(): number;
    get_node_count(): number;
    get_node_stride(): number;
    constructor();
}

/**
 * Compute pass drawing physics and serialize directly to JsValue
 */
export function compute_pass_physics_js(d_in_mm: number, d_out_mm: number, approach_angle_2alpha_deg: number, friction_mu: number, material_str: string, wire_speed_mpm: number): any;

/**
 * Evaluate Avitzur central burst hazard parameter Delta
 */
export function evaluate_central_burst_js(alpha_deg_half: number, r_fraction: number): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_drawingengine_free: (a: number, b: number) => void;
    readonly compute_pass_physics_js: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
    readonly drawingengine_compute_mesh: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number) => void;
    readonly drawingengine_get_max_temperature: (a: number) => number;
    readonly drawingengine_get_max_von_mises: (a: number) => number;
    readonly drawingengine_get_mesh_buffer_len: (a: number) => number;
    readonly drawingengine_get_mesh_buffer_ptr: (a: number) => number;
    readonly drawingengine_get_node_count: (a: number) => number;
    readonly drawingengine_get_node_stride: (a: number) => number;
    readonly drawingengine_new: () => number;
    readonly evaluate_central_burst_js: (a: number, b: number) => [number, number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
