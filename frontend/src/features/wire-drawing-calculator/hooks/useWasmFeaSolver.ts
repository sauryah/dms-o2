import { useState, useEffect, useRef } from 'react';
import {
  computeFeaMeshWasm,
  computePassPhysicsWasm,
  ensureWasmInitialized,
  WasmFeaMeshConfig,
  WasmFeaMeshResult,
  WasmPassPhysics,
} from '../wasm/WasmBridge';

export interface UseWasmFeaSolverOptions {
  dInMm: number;
  dOutMm: number;
  approachAngle2AlphaDeg: number;
  bearingLengthLbRatioPct?: number;
  backRelief2BetaDeg?: number;
  frictionMu?: number;
  materialStr?: string;
  wireSpeedMpm?: number;
  numAxialSlices?: number;
  numRadialRings?: number;
  numAngularSegments?: number;
  enabled?: boolean;
}

export interface UseWasmFeaSolverReturn {
  isWasmReady: boolean;
  mesh: WasmFeaMeshResult | null;
  physics: WasmPassPhysics | null;
  isLoading: boolean;
  error: string | null;
  recompute: () => Promise<void>;
}

export function useWasmFeaSolver({
  dInMm,
  dOutMm,
  approachAngle2AlphaDeg,
  bearingLengthLbRatioPct = 35.0,
  backRelief2BetaDeg = 30.0,
  frictionMu = 0.06,
  materialStr = 'copper',
  wireSpeedMpm = 600,
  numAxialSlices = 36,
  numRadialRings = 4,
  numAngularSegments = 16,
  enabled = true,
}: UseWasmFeaSolverOptions): UseWasmFeaSolverReturn {
  const [isWasmReady, setIsWasmReady] = useState(false);
  const [mesh, setMesh] = useState<WasmFeaMeshResult | null>(null);
  const [physics, setPhysics] = useState<WasmPassPhysics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    ensureWasmInitialized().then((ready) => {
      if (isMountedRef.current) {
        setIsWasmReady(ready);
      }
    });

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const runCalculation = async () => {
    if (!enabled || dInMm <= dOutMm || dOutMm <= 0) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const cfg: WasmFeaMeshConfig = {
        dInMm,
        dOutMm,
        approachAngle2AlphaDeg,
        bearingLengthLbRatioPct,
        backRelief2BetaDeg,
        frictionMu,
        materialStr,
        wireSpeedMpm,
        numAxialSlices,
        numRadialRings,
        numAngularSegments,
      };

      const [meshResult, physicsResult] = await Promise.all([
        computeFeaMeshWasm(cfg),
        computePassPhysicsWasm(
          dInMm,
          dOutMm,
          approachAngle2AlphaDeg,
          frictionMu,
          materialStr,
          wireSpeedMpm
        ),
      ]);

      if (isMountedRef.current) {
        setMesh(meshResult);
        setPhysics(physicsResult);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Wasm FEA calculation error');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isWasmReady && enabled) {
      runCalculation();
    }
  }, [
    isWasmReady,
    enabled,
    dInMm,
    dOutMm,
    approachAngle2AlphaDeg,
    bearingLengthLbRatioPct,
    backRelief2BetaDeg,
    frictionMu,
    materialStr,
    wireSpeedMpm,
    numAxialSlices,
    numRadialRings,
    numAngularSegments,
  ]);

  return {
    isWasmReady,
    mesh,
    physics,
    isLoading,
    error,
    recompute: runCalculation,
  };
}
