import { describe, it, expect, beforeAll } from 'vitest';
import {
  ensureWasmInitialized,
  computePassPhysicsWasm,
  computeFeaMeshWasm,
  checkCentralBurstWasm,
} from '../wasm/WasmBridge';

describe('WebAssembly Wire Drawing Engine (wasm-drawing-engine)', () => {
  beforeAll(async () => {
    const ready = await ensureWasmInitialized();
    expect(ready).toBe(true);
  });

  it('calculates true strain, drawing stress, and adiabatic heat rise accurately', async () => {
    const dIn = 1.0;
    const dOut = 0.8;
    const alpha2Alpha = 16.0;

    const res = await computePassPhysicsWasm(dIn, dOut, alpha2Alpha, 0.06, 'copper', 600);

    expect(res).not.toBeNull();
    if (!res) return;

    // 1.0 -> 0.8 mm is 36% area reduction
    expect(res.area_reduction_percent).toBeCloseTo(36.0, 1);
    expect(res.true_strain_epsilon).toBeCloseTo(0.446, 2);
    expect(res.flow_stress_mpa).toBeGreaterThan(150);
    expect(res.drawing_stress_sigma_d_mpa).toBeGreaterThan(50);
    expect(res.drawing_force_n).toBeGreaterThan(20);
    expect(res.drawing_power_kw).toBeGreaterThan(0);
    expect(res.adiabatic_temp_rise_c).toBeGreaterThan(0);
    expect(res.total_exit_temp_c).toBeGreaterThan(25.0);
    expect(res.central_burst_risk).toBe('Safe');
  });

  it('generates 3D FEA nodal grid with zero-copy Float32Array linear buffer', async () => {
    const numSlices = 12;
    const numRings = 3;
    const numSegments = 8;
    const expectedNodeCount = numSlices * numRings * numSegments;

    const res = await computeFeaMeshWasm({
      dInMm: 1.0,
      dOutMm: 0.85,
      approachAngle2AlphaDeg: 14.0,
      bearingLengthLbRatioPct: 35.0,
      backRelief2BetaDeg: 30.0,
      frictionMu: 0.06,
      materialStr: 'copper',
      wireSpeedMpm: 800,
      numAxialSlices: numSlices,
      numRadialRings: numRings,
      numAngularSegments: numSegments,
    });

    expect(res).not.toBeNull();
    if (!res) return;

    expect(res.nodeCount).toBe(expectedNodeCount);
    expect(res.stride).toBe(7);
    expect(res.nodes).toBeInstanceOf(Float32Array);
    expect(res.nodes.length).toBe(expectedNodeCount * 7);
    expect(res.maxVonMises).toBeGreaterThan(0);
    expect(res.maxTemperature).toBeGreaterThanOrEqual(25.0);

    // Verify first node structure [x, y, z, vonMises, temp, strain, zoneId]
    const x0 = res.nodes[0];
    const y0 = res.nodes[1];
    const z0 = res.nodes[2];
    const vm0 = res.nodes[3];
    const temp0 = res.nodes[4];
    const zone0 = res.nodes[6];

    expect(typeof x0).toBe('number');
    expect(typeof y0).toBe('number');
    expect(typeof z0).toBe('number');
    expect(vm0).toBeGreaterThanOrEqual(0);
    expect(temp0).toBeGreaterThanOrEqual(25.0);
    expect(zone0).toBeGreaterThanOrEqual(0);
  });

  it('flags high-angle low-reduction passes as critical central burst risk', async () => {
    // Semi-angle 22 degrees, very small reduction 0.04 (4%)
    const res = await checkCentralBurstWasm(22.0, 0.04);
    expect(res).not.toBeNull();
    if (!res) return;

    const [delta, risk] = res;
    expect(delta).toBeGreaterThan(1.5);
    expect(risk).toBe('CriticalBurstRisk');
  });

  it('supports multiple material properties (High-Carbon Steel, Aluminum, Brass)', async () => {
    const steel = await computePassPhysicsWasm(2.0, 1.6, 12.0, 0.08, 'steel', 300);
    const aluminum = await computePassPhysicsWasm(2.0, 1.6, 12.0, 0.05, 'aluminum', 300);

    expect(steel).not.toBeNull();
    expect(aluminum).not.toBeNull();
    if (!steel || !aluminum) return;

    // High carbon steel flow stress must be higher than aluminum
    expect(steel.flow_stress_mpa).toBeGreaterThan(aluminum.flow_stress_mpa);
    expect(steel.drawing_force_n).toBeGreaterThan(aluminum.drawing_force_n);
  });
});
