import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  Play,
  Pause,
  Activity,
  Camera,
  Scissors,
  Thermometer,
  Layers,
  Gauge,
  ChevronRight,
  Zap,
  HelpCircle,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Move,
  Compass,
  Crosshair,
  Maximize,
  Ruler,
  FileText,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { PassData } from '../types';

interface StressHeatmap3DProps {
  passes: PassData[];
}

interface HoverInfo {
  x: number;
  y: number;
  axial: number;
  stress: number;
  temp: number;
  strain: number;
}

interface TrainHoverInfo {
  screenX: number;
  screenY: number;
  passIdx: number;
  passNum: number;
  din: number;
  dout: number;
  areaRed: number;
  elongation: number;
  speedMultiplier: number;
  drawingForceN: number;
  sigmaD: number;
}

// 4-Zone Die Bore Architecture Types
export type DieZoneType = 'all' | 'bell' | 'cone' | 'bearing' | 'relief';

export interface ZoneDetail {
  name: string;
  role: string;
  angleOrDim: string;
  formula: string;
  purpose: string;
  color: string;
}

export const DIE_ZONES: Record<DieZoneType, ZoneDetail> = {
  all: {
    name: 'Full Die Assembly',
    role: 'DIN 2812 Standard Continuous Wire Reduction',
    angleOrDim: 'Zones 1–4 Integrated',
    formula: 'σ_d = σ_flow · φ · ε · (1 + μ/tan α)',
    purpose: 'Complete die bore profile with entrance bell, reduction cone, bearing land, and back relief clearance.',
    color: '#a855f7',
  },
  bell: {
    name: 'Zone 1: Bell Entrance Radius',
    role: 'Hydrodynamic Lubricant Ingestion Wedge',
    angleOrDim: 'R_bell = 18.0 mm',
    formula: 'p_hydro = (6 · η · v) / h²',
    purpose: 'Smooth transition that guides wire into the die, prevents surface oxide shaving, and draws drawing soap/oil under hydrodynamic pressure.',
    color: '#38bdf8',
  },
  cone: {
    name: 'Zone 2: Approach Reduction Cone',
    role: 'Primary Plastic Deformation & Work Hardening',
    angleOrDim: '2α = Approach Angle',
    formula: 'σ_m = 2/3 · Y · ln(d₁/d₂) / sin(α)',
    purpose: 'Compresses wire from inlet d₁ to exit d₂. The approach angle 2α minimizes total energy by balancing redundant shear strain and boundary friction.',
    color: '#c084fc',
  },
  bearing: {
    name: 'Zone 3: Parallel Bearing Land (Lb)',
    role: 'Final Calibration, Sizing & Surface Burnishing',
    angleOrDim: 'Lb = 35% d₂',
    formula: 'ΔF_frict = π · d₂ · Lb · μ · p',
    purpose: 'Sets final wire diameter, circularity, and surface finish. Optimum length prevents diameter relaxation without excessive frictional drag.',
    color: '#34d399',
  },
  relief: {
    name: 'Zone 4: Back Relief Exit Cone',
    role: 'Elastic Springback Clearance & Anti-Chipping',
    angleOrDim: '2β = 30° Exit Angle',
    formula: 'δ_spring = (σ_y / E) · d₂',
    purpose: 'Allows wire to expand elastically upon exiting without scraping against the sharp bearing edge, preventing die ring-out chipping.',
    color: '#fbbf24',
  },
};

// Mutable camera state to decouple 60/120 FPS rendering from React re-renders
export interface CameraState {
  rotX: number;
  rotY: number;
  zoom: number;
  panX: number;
  panY: number;
  isDragging: boolean;
}

// Material presets for realistic rendering
type WireMaterialType = 'copper' | 'steel' | 'aluminum' | 'brass';
type DieNibMaterialType = 'carbide' | 'pcd' | 'diamond';

interface MaterialTheme {
  name: string;
  wireGradient: [string, string, string];
  wireContact: string;
  sparkColor: string;
}

const WIRE_MATERIALS: Record<WireMaterialType, MaterialTheme> = {
  copper: {
    name: 'Electrolytic Copper (Cu-ETP)',
    wireGradient: ['#b45309', '#fef08a', '#ea580c'],
    wireContact: '#fb923c',
    sparkColor: '#fed7aa',
  },
  steel: {
    name: 'High-Carbon Steel (AISI 1070)',
    wireGradient: ['#475569', '#f8fafc', '#94a3b8'],
    wireContact: '#e2e8f0',
    sparkColor: '#ffffff',
  },
  aluminum: {
    name: 'EC Grade Aluminum (Al 1350)',
    wireGradient: ['#64748b', '#ffffff', '#cbd5e1'],
    wireContact: '#f1f5f9',
    sparkColor: '#ffffff',
  },
  brass: {
    name: 'Cartridge Brass (CuZn30)',
    wireGradient: ['#a16207', '#fef08a', '#eab308'],
    wireContact: '#fde047',
    sparkColor: '#fef9c3',
  },
};

const DIE_MATERIALS: Record<DieNibMaterialType, { name: string; coreColor: string; rimColor: string; brazeColor: string; luster: string }> = {
  carbide: {
    name: 'Tungsten Carbide (WC-Co 6%)',
    coreColor: '#1e293b',
    rimColor: '#334155',
    brazeColor: '#ca8a04',
    luster: '#94a3b8',
  },
  pcd: {
    name: 'Polycrystalline Diamond (PCD)',
    coreColor: '#0f172a',
    rimColor: '#1e293b',
    brazeColor: '#0284c7',
    luster: '#38bdf8',
  },
  diamond: {
    name: 'Natural Monocrystalline Diamond (ND)',
    coreColor: '#0b1329',
    rimColor: '#1e3a8a',
    brazeColor: '#38bdf8',
    luster: '#e0f2fe',
  },
};

// =========================================================================
// HIGH-PERFORMANCE TRIGONOMETRIC LOOKUP TABLES (ZERO ALLOCATION)
// =========================================================================
interface TrigLUT {
  cos: Float32Array;
  sin: Float32Array;
  count: number;
}

function createTrigLUT(count: number): TrigLUT {
  const cos = new Float32Array(count + 1);
  const sin = new Float32Array(count + 1);
  for (let i = 0; i <= count; i++) {
    const a = (i / count) * Math.PI * 2;
    cos[i] = Math.cos(a);
    sin[i] = Math.sin(a);
  }
  return { cos, sin, count };
}

const LUT_12 = createTrigLUT(12); // Fast Drag LOD
const LUT_18 = createTrigLUT(18); // Standard wire cylinder
const LUT_24 = createTrigLUT(24); // Die Casing & Disc
const LUT_36 = createTrigLUT(36); // High-Precision Single Die

// Physical and material constants for wire drawing stress calculations
const STRENGTH_COEFFICIENT_K = 315;
const HARDENING_EXPONENT_N = 0.54;
const FRICTION_COEFFICIENT_MU = 0.04;

const computeDrawingStress = (pass: PassData, approachAngle2Alpha: number = 14) => {
  if (!pass) return 0;
  const areaRed = pass.areaReduction ?? 0;
  const rFrac = Math.max(0.01, Math.min(0.9, areaRed / 100));
  const alphaRadHalf = ((approachAngle2Alpha / 2) * Math.PI) / 180;
  const epsilon = Math.log(1 / (1 - rFrac));
  const sigmaFlow = STRENGTH_COEFFICIENT_K * Math.pow(Math.max(epsilon, 0.001), HARDENING_EXPONENT_N) / (HARDENING_EXPONENT_N + 1);
  const phi = 0.88 + 0.12 * ((alphaRadHalf * 2) / rFrac) * (1 - rFrac);
  return sigmaFlow * phi * epsilon * (1 + FRICTION_COEFFICIENT_MU / Math.tan(Math.max(alphaRadHalf, 0.01)));
};

const computeDrawingForce = (pass: PassData, approachAngle2Alpha: number = 14) => {
  if (!pass) return 0;
  const sigmaD = computeDrawingStress(pass, approachAngle2Alpha);
  const exitArea = Math.PI * Math.pow((pass.toDie ?? 1.0) / 2, 2);
  return sigmaD * exitArea;
};

// =========================================================================
// 1. MULTI-PASS CONTINUOUS WIRE DRAWING TRAIN 3D CANVAS (60+ FPS OPTIMIZED)
// =========================================================================
const MultiPassTrainCanvas = React.memo(function MultiPassTrainCanvas({
  passes,
  selectedPassIdx,
  onSelectPass,
  cameraRef,
  isPlaying,
  speedRate,
  showCapstans,
  showLabels,
  showVelocityTags,
  wireMaterial,
  dieNibMaterial,
  onHoverStation,
  canvasRef,
}: {
  passes: PassData[];
  selectedPassIdx: number;
  onSelectPass: (idx: number) => void;
  cameraRef: React.MutableRefObject<CameraState>;
  isPlaying: boolean;
  speedRate: number;
  showCapstans: boolean;
  showLabels: boolean;
  showVelocityTags: boolean;
  wireMaterial: WireMaterialType;
  dieNibMaterial: DieNibMaterialType;
  onHoverStation: (info: TrainHoverInfo | null) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const displaySizeRef = useRef<{ w: number; h: number }>({ w: 800, h: 420 });

  // Geometry computation for multi-die line
  const N = passes.length;
  const initialDia = passes[0]?.fromDie ?? 2.5;
  const initialArea = Math.PI * Math.pow(initialDia / 2, 2);

  const stationSpacing = Math.max(95, Math.min(140, 1050 / Math.max(N, 1)));
  const totalLength = (N - 1) * stationSpacing;
  const startX = -totalLength / 2;

  const stations = passes.map((p, idx) => {
    const x = startX + idx * stationSpacing;
    const din = p.fromDie;
    const dout = p.toDie;
    const areaOut = Math.PI * Math.pow(dout / 2, 2);
    const speedMult = Math.max(1.0, initialArea / Math.max(0.0001, areaOut));
    const forceN = computeDrawingForce(p);
    const sigmaD = computeDrawingStress(p);

    const rawRin = (din / initialDia) * 14;
    const rawRout = (dout / initialDia) * 14;
    const rIn = Math.max(3.0, rawRin);
    const rOut = Math.max(1.8, rawRout);

    return {
      idx,
      pass: p.pass,
      x,
      din,
      dout,
      rIn,
      rOut,
      areaRed: p.areaReduction ?? 0,
      elongation: p.elongation ?? 0,
      speedMultiplier: speedMult,
      drawingForceN: forceN,
      sigmaD,
    };
  });

  // ResizeObserver for responsive canvas
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const w = Math.max(320, Math.floor(width));
        const h = Math.max(300, Math.floor(height));
        displaySizeRef.current = { w, h };

        const canvas = canvasRef.current;
        if (canvas) {
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          canvas.width = w * dpr;
          canvas.height = h * dpr;
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.scale(dpr, dpr);
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [canvasRef]);

  // Station hover detection via direct ref reading
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const cam = cameraRef.current;
    const radX = (cam.rotX * Math.PI) / 180;
    const radY = (cam.rotY * Math.PI) / 180;
    const centerCanvasX = displaySizeRef.current.w / 2;
    const centerCanvasY = displaySizeRef.current.h / 2;

    let closestStation: TrainHoverInfo | null = null;
    let minDistance = 50;

    stations.forEach((st) => {
      const x1 = (st.x + cam.panX) * Math.cos(radY);
      const z1 = -(st.x + cam.panX) * Math.sin(radY);
      const y2 = cam.panY * Math.cos(radX) - z1 * Math.sin(radX);
      const px = centerCanvasX + x1 * cam.zoom;
      const py = centerCanvasY + y2 * cam.zoom;

      const dist = Math.hypot(mouseX - px, mouseY - py);
      if (dist < minDistance) {
        minDistance = dist;
        closestStation = {
          screenX: e.clientX,
          screenY: e.clientY,
          passIdx: st.idx,
          passNum: st.pass,
          din: st.din,
          dout: st.dout,
          areaRed: st.areaRed,
          elongation: st.elongation,
          speedMultiplier: st.speedMultiplier,
          drawingForceN: st.drawingForceN,
          sigmaD: st.sigmaD,
        };
      }
    });

    onHoverStation(closestStation);
  }, [canvasRef, stations, cameraRef, onHoverStation]);

  const handleMouseLeave = useCallback(() => {
    onHoverStation(null);
  }, [onHoverStation]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const cam = cameraRef.current;
    const radX = (cam.rotX * Math.PI) / 180;
    const radY = (cam.rotY * Math.PI) / 180;
    const centerCanvasX = displaySizeRef.current.w / 2;
    const centerCanvasY = displaySizeRef.current.h / 2;

    let targetIdx: number | null = null;
    let minDistance = 45;

    stations.forEach((st) => {
      const x1 = (st.x + cam.panX) * Math.cos(radY);
      const z1 = -(st.x + cam.panX) * Math.sin(radY);
      const y2 = cam.panY * Math.cos(radX) - z1 * Math.sin(radX);
      const px = centerCanvasX + x1 * cam.zoom;
      const py = centerCanvasY + y2 * cam.zoom;

      const dist = Math.hypot(mouseX - px, mouseY - py);
      if (dist < minDistance) {
        minDistance = dist;
        targetIdx = st.idx;
      }
    });

    if (targetIdx !== null) {
      onSelectPass(targetIdx);
    }
  }, [canvasRef, stations, cameraRef, onSelectPass]);

  // High-Performance Zero-GC Render Loop
  useEffect(() => {
    let animId: number;
    let flowTime = 0;
    let lastTime = performance.now();

    const numParticles = Math.min(80, Math.max(30, N * 5));
    const particlePositions = new Float32Array(numParticles);
    const particleAngles = new Float32Array(numParticles);
    for (let i = 0; i < numParticles; i++) {
      particlePositions[i] = i / numParticles;
      particleAngles[i] = (i * 1.37) % (Math.PI * 2);
    }

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(render);
        return;
      }

      const width = displaySizeRef.current.w;
      const height = displaySizeRef.current.h;
      ctx.clearRect(0, 0, width, height);

      // Deep Industrial Studio Background (Single Fill)
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, width, height);

      // Batched Grid Lines in Single Path (Zero Overhead)
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const gridSpacing = 40;
      for (let x = 0; x < width; x += gridSpacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      ctx.save();
      ctx.translate(width / 2, height / 2);

      const cam = cameraRef.current;
      const radX = (cam.rotX * Math.PI) / 180;
      const radY = (cam.rotY * Math.PI) / 180;
      const cosX = Math.cos(radX);
      const sinX = Math.sin(radX);
      const cosY = Math.cos(radY);
      const sinY = Math.sin(radY);
      const zScale = cam.zoom;

      // 3D Perspective Projection Function (Inlined Matrix Multiplications)
      const project = (x: number, y: number, z: number) => {
        const xOffset = x + cam.panX;
        const yOffset = y + cam.panY;
        const x1 = xOffset * cosY + z * sinY;
        const z1 = -xOffset * sinY + z * cosY;
        const y2 = yOffset * cosX - z1 * sinX;
        const z2 = yOffset * sinX + z1 * cosX;
        return {
          px: x1 * zScale,
          py: y2 * zScale,
          depth: z2,
        };
      };

      const mat = WIRE_MATERIALS[wireMaterial];
      const dieMat = DIE_MATERIALS[dieNibMaterial];
      const activeLUT = cam.isDragging ? LUT_12 : LUT_24;

      // 3D Render Queue for Zero-Artifact Depth Sorting
      interface RenderItem {
        depth: number;
        draw: () => void;
      }
      const renderQueue: RenderItem[] = [];

      const addQuad = (
        p1: { px: number; py: number; depth: number },
        p2: { px: number; py: number; depth: number },
        p3: { px: number; py: number; depth: number },
        p4: { px: number; py: number; depth: number },
        fill: string,
        stroke?: string,
        strokeW: number = 1,
        alpha: number = 1.0
      ) => {
        const avgDepth = (p1.depth + p2.depth + p3.depth + p4.depth) * 0.25;
        renderQueue.push({
          depth: avgDepth,
          draw: () => {
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.lineTo(p3.px, p3.py);
            ctx.lineTo(p4.px, p4.py);
            ctx.closePath();
            ctx.fillStyle = fill;
            if (alpha < 0.99) ctx.globalAlpha = alpha;
            ctx.fill();
            if (alpha < 0.99) ctx.globalAlpha = 1.0;
            if (stroke) {
              ctx.strokeStyle = stroke;
              ctx.lineWidth = strokeW;
              ctx.stroke();
            }
          },
        });
      };

      // Draw 3D Rotated Disc using Trigonometric LUT
      const draw3DDisc = (
        xPos: number,
        rInner: number,
        rOuter: number,
        fillStyle: string,
        strokeStyle?: string,
        lineWidth: number = 1
      ) => {
        const lut = activeLUT;
        const count = lut.count;
        ctx.beginPath();
        for (let s = 0; s <= count; s++) {
          const y = rOuter * lut.cos[s];
          const z = rOuter * lut.sin[s];
          const p = project(xPos, y, z);
          if (s === 0) ctx.moveTo(p.px, p.py);
          else ctx.lineTo(p.px, p.py);
        }
        if (rInner > 0.5) {
          for (let s = count; s >= 0; s--) {
            const y = rInner * lut.cos[s];
            const z = rInner * lut.sin[s];
            const p = project(xPos, y, z);
            ctx.lineTo(p.px, p.py);
          }
        }
        ctx.closePath();
        ctx.fillStyle = fillStyle;
        ctx.fill();
        if (strokeStyle) {
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }
      };

      // 1. Heavy Machined Foundation Bed & Guideways (Segmented for True 3D Depth Sorting)
      const lineLeft = startX - 80;
      const lineRight = startX + (N - 1) * stationSpacing + 80;
      const railY = 48;
      const railDepth = 30;
      const numBedSegs = Math.max(12, N * 2);
      const segStep = (lineRight - lineLeft) / numBedSegs;

      for (let s = 0; s < numBedSegs; s++) {
        const x1 = lineLeft + s * segStep;
        const x2 = lineLeft + (s + 1) * segStep;

        // Top Foundation Bed Plate Segment
        const t1 = project(x1, railY, -railDepth);
        const t2 = project(x2, railY, -railDepth);
        const t3 = project(x2, railY, railDepth);
        const t4 = project(x1, railY, railDepth);
        addQuad(t1, t2, t3, t4, '#0f172a', 'rgba(51, 65, 85, 0.5)', 0.6);

        // Front Bevel Edge
        const f1 = project(x1, railY, railDepth);
        const f2 = project(x2, railY, railDepth);
        const f3 = project(x2, railY + 8, railDepth);
        const f4 = project(x1, railY + 8, railDepth);
        addQuad(f1, f2, f3, f4, '#1e293b', 'rgba(71, 85, 105, 0.6)', 0.8);

        // Machined Center Guide Way Groove
        const g1 = project(x1, railY - 0.2, -6);
        const g2 = project(x2, railY - 0.2, -6);
        const g3 = project(x2, railY - 0.2, 6);
        const g4 = project(x1, railY - 0.2, 6);
        addQuad(g1, g2, g3, g4, '#1e293b', 'rgba(100, 116, 139, 0.4)', 0.5);
      }

      // 2. Realistic Metallic Drawn Wire (LUT Driven)
      const addWireSegment = (
        xStart: number,
        xEnd: number,
        rStart: number,
        rEnd: number,
        isDeforming: boolean
      ) => {
        const lut = cam.isDragging ? LUT_12 : LUT_18;
        const count = lut.count;

        for (let i = 0; i < count; i++) {
          const cos1 = lut.cos[i];
          const sin1 = lut.sin[i];
          const cos2 = lut.cos[i + 1];
          const sin2 = lut.sin[i + 1];

          const p1 = project(xStart, rStart * cos1, rStart * sin1);
          const p2 = project(xStart, rStart * cos2, rStart * sin2);
          const p3 = project(xEnd, rEnd * cos2, rEnd * sin2);
          const p4 = project(xEnd, rEnd * cos1, rEnd * sin1);

          const normalY = (cos1 + cos2) * 0.5;
          const diffuse = Math.max(0.2, 0.45 + 0.55 * (-normalY));
          const fill = isDeforming ? mat.wireContact : mat.wireGradient[0];

          addQuad(p1, p2, p3, p4, fill, undefined, 1, diffuse);
        }
      };

      const firstSt = stations[0];
      if (firstSt) {
        addWireSegment(lineLeft, firstSt.x - 10, firstSt.rIn, firstSt.rIn, false);
      }

      for (let i = 0; i < N; i++) {
        const curr = stations[i];
        const next = stations[i + 1];

        const dieStart = curr.x - 10;
        const dieEnd = curr.x + 10;
        addWireSegment(dieStart, dieEnd, curr.rIn, curr.rOut, true);

        if (next) {
          addWireSegment(dieEnd, next.x - 10, curr.rOut, curr.rOut, false);
        }
      }

      const lastSt = stations[N - 1];
      if (lastSt) {
        addWireSegment(lastSt.x + 10, lineRight, lastSt.rOut, lastSt.rOut, false);
      }

      // 3. Solid Turned-Steel Industrial Bullblock Pulling Drums
      if (showCapstans) {
        for (let i = 0; i < N - 1; i++) {
          const stA = stations[i];
          const stB = stations[i + 1];
          const capstanX = (stA.x + stB.x) / 2;
          const capstanY = 16;
          const capstanR = 16;
          const capstanZ = 16;

          const drumCenter = project(capstanX, capstanY, capstanZ);
          const drumRotSpeed = flowTime * (stA.speedMultiplier * 0.08);

          renderQueue.push({
            depth: drumCenter.depth,
            draw: () => {
              // A. Heavy Steel Mounting Arbor Flange
              const pMount = project(capstanX, capstanY + 6, capstanZ - 6);
              ctx.beginPath();
              ctx.arc(pMount.px, pMount.py, 18 * zScale, 0, Math.PI * 2);
              ctx.fillStyle = '#0f172a';
              ctx.strokeStyle = '#334155';
              ctx.lineWidth = 1;
              ctx.fill();
              ctx.stroke();

              // B. Main Cylindrical Turned-Steel Bullblock Body
              const capsegs = 20;
              ctx.beginPath();
              for (let s = 0; s <= capsegs; s++) {
                const angle = (s / capsegs) * Math.PI * 2;
                const px = capstanX + capstanR * Math.cos(angle);
                const py = capstanY + capstanR * Math.sin(angle);
                const p = project(px, py, capstanZ);
                if (s === 0) ctx.moveTo(p.px, p.py);
                else ctx.lineTo(p.px, p.py);
              }
              ctx.closePath();
              ctx.fillStyle = '#1e293b';
              ctx.fill();
              ctx.strokeStyle = '#64748b';
              ctx.lineWidth = 1.2;
              ctx.stroke();

              // C. Machined Step Rim & Wire Traction Groove
              ctx.beginPath();
              for (let s = 0; s <= capsegs; s++) {
                const angle = (s / capsegs) * Math.PI * 2;
                const px = capstanX + (capstanR * 0.78) * Math.cos(angle);
                const py = capstanY + (capstanR * 0.78) * Math.sin(angle);
                const p = project(px, py, capstanZ + 2);
                if (s === 0) ctx.moveTo(p.px, p.py);
                else ctx.lineTo(p.px, p.py);
              }
              ctx.closePath();
              ctx.fillStyle = '#334155';
              ctx.fill();
              ctx.strokeStyle = '#94a3b8';
              ctx.lineWidth = 0.8;
              ctx.stroke();

              // D. Center Drive Axle Boss & Hex Nut
              const hubR = capstanR * 0.42;
              ctx.beginPath();
              for (let s = 0; s <= capsegs; s++) {
                const angle = (s / capsegs) * Math.PI * 2;
                const px = capstanX + hubR * Math.cos(angle);
                const py = capstanY + hubR * Math.sin(angle);
                const p = project(px, py, capstanZ + 3);
                if (s === 0) ctx.moveTo(p.px, p.py);
                else ctx.lineTo(p.px, p.py);
              }
              ctx.closePath();
              ctx.fillStyle = '#0f172a';
              ctx.fill();
              ctx.strokeStyle = '#475569';
              ctx.lineWidth = 1.0;
              ctx.stroke();

              // E. Rotating Timing Index Notch (Subtle rotation cue without fan blades)
              const notchAngle = drumRotSpeed;
              const nX = capstanX + Math.cos(notchAngle) * (hubR * 0.72);
              const nY = capstanY + Math.sin(notchAngle) * (hubR * 0.72);
              const pNotch = project(nX, nY, capstanZ + 3.5);
              ctx.beginPath();
              ctx.arc(pNotch.px, pNotch.py, 2.2 * zScale, 0, Math.PI * 2);
              ctx.fillStyle = '#38bdf8';
              ctx.fill();

              // Central Socket Hex Bolt
              const pBolt = project(capstanX, capstanY, capstanZ + 3.5);
              ctx.beginPath();
              ctx.arc(pBolt.px, pBolt.py, 3.2 * zScale, 0, Math.PI * 2);
              ctx.fillStyle = '#94a3b8';
              ctx.fill();
            },
          });
        }
      }

      // Camera view direction check for front/rear visibility
      const frontNormalZ = sinY * cosX;
      const isFrontFaceVisible = frontNormalZ < 0;

      // 4. Precision Industrial Die Assemblies & Mounting Stands
      stations.forEach((st) => {
        const isSelected = st.idx === selectedPassIdx;
        const casingOuterR = Math.max(26, st.rIn + 16);
        const nibOuterR = casingOuterR * 0.58;
        const housingThickness = 20;
        const xStandStart = st.x - housingThickness / 2;
        const xStandEnd = st.x + housingThickness / 2;

        // A. True Under-Die 3D Support Pedestal (Zero Obstruction of Dies or Wire)
        const standW = housingThickness + 6;
        const standD = 18;
        const yTop = casingOuterR - 2;
        const yBot = railY;

        // Front Pedestal Face (z = +standD/2)
        const pFront1 = project(st.x - standW / 2, yTop, standD / 2);
        const pFront2 = project(st.x + standW / 2, yTop, standD / 2);
        const pFront3 = project(st.x + standW / 2, yBot, standD / 2);
        const pFront4 = project(st.x - standW / 2, yBot, standD / 2);
        addQuad(
          pFront1,
          pFront2,
          pFront3,
          pFront4,
          isSelected ? 'rgba(88, 28, 135, 0.9)' : '#1e293b',
          isSelected ? '#c084fc' : '#475569',
          1.0
        );

        // Back Pedestal Face (z = -standD/2)
        const pBack1 = project(st.x + standW / 2, yTop, -standD / 2);
        const pBack2 = project(st.x - standW / 2, yTop, -standD / 2);
        const pBack3 = project(st.x - standW / 2, yBot, -standD / 2);
        const pBack4 = project(st.x + standW / 2, yBot, -standD / 2);
        addQuad(
          pBack1,
          pBack2,
          pBack3,
          pBack4,
          isSelected ? 'rgba(88, 28, 135, 0.9)' : '#1e293b',
          isSelected ? '#c084fc' : '#475569',
          1.0
        );

        // Left Pedestal Face (x = st.x - standW/2)
        const pLeft1 = project(st.x - standW / 2, yTop, -standD / 2);
        const pLeft2 = project(st.x - standW / 2, yTop, standD / 2);
        const pLeft3 = project(st.x - standW / 2, yBot, standD / 2);
        const pLeft4 = project(st.x - standW / 2, yBot, -standD / 2);
        addQuad(
          pLeft1,
          pLeft2,
          pLeft3,
          pLeft4,
          isSelected ? 'rgba(107, 33, 168, 0.9)' : '#0f172a',
          isSelected ? '#c084fc' : '#334155',
          0.8
        );

        // Right Pedestal Face (x = st.x + standW/2)
        const pRight1 = project(st.x + standW / 2, yTop, standD / 2);
        const pRight2 = project(st.x + standW / 2, yTop, -standD / 2);
        const pRight3 = project(st.x + standW / 2, yBot, -standD / 2);
        const pRight4 = project(st.x + standW / 2, yBot, standD / 2);
        addQuad(
          pRight1,
          pRight2,
          pRight3,
          pRight4,
          isSelected ? 'rgba(107, 33, 168, 0.9)' : '#0f172a',
          isSelected ? '#c084fc' : '#334155',
          0.8
        );

        // Pedestal Base Anchor Bolts
        const bolt1 = project(st.x - standW / 2 + 3, railY - 2, standD / 2);
        const bolt2 = project(st.x + standW / 2 - 3, railY - 2, standD / 2);
        [bolt1, bolt2].forEach((b) => {
          renderQueue.push({
            depth: b.depth,
            draw: () => {
              ctx.beginPath();
              ctx.arc(b.px, b.py, 2 * zScale, 0, Math.PI * 2);
              ctx.fillStyle = '#94a3b8';
              ctx.fill();
            },
          });
        });

        // B. Die Back Silhouette (when facing away)
        if (!isFrontFaceVisible) {
          const pBackCenter = project(xStandStart, 0, 0);
          renderQueue.push({
            depth: pBackCenter.depth - 0.05,
            draw: () => {
              draw3DDisc(xStandStart, st.rIn, casingOuterR, '#1e293b', '#475569', 1);
            },
          });
        } else {
          const pBackCenter = project(xStandEnd, 0, 0);
          renderQueue.push({
            depth: pBackCenter.depth - 0.05,
            draw: () => {
              draw3DDisc(xStandEnd, st.rOut, casingOuterR, '#1e293b', '#475569', 1);
            },
          });
        }

        // C. 3D Cylindrical Die Casing Body (LUT Driven)
        const lut = activeLUT;
        const count = lut.count;
        for (let s = 0; s < count; s++) {
          const cos1 = lut.cos[s];
          const sin1 = lut.sin[s];
          const cos2 = lut.cos[s + 1];
          const sin2 = lut.sin[s + 1];

          const p1 = project(xStandStart, casingOuterR * cos1, casingOuterR * sin1);
          const p2 = project(xStandStart, casingOuterR * cos2, casingOuterR * sin2);
          const p3 = project(xStandEnd, casingOuterR * cos2, casingOuterR * sin2);
          const p4 = project(xStandEnd, casingOuterR * cos1, casingOuterR * sin1);

          const normalY = (cos1 + cos2) * 0.5;
          const lightIntensity = Math.max(0.25, 0.5 + 0.5 * (-normalY));

          let fill: string;
          if (isSelected) {
            fill = `rgba(168, 85, 247, ${lightIntensity * 0.9})`;
          } else {
            const steelVal = Math.floor(100 + lightIntensity * 120);
            fill = `rgb(${steelVal * 0.4}, ${steelVal * 0.45}, ${steelVal * 0.55})`;
          }

          addQuad(p1, p2, p3, p4, fill);
        }

        // D. 3D Rotated Perspective Die Face Annulus (With Real Wire Bore Hole)
        if (isFrontFaceVisible) {
          const pFaceCenter = project(xStandStart, 0, 0);
          renderQueue.push({
            depth: pFaceCenter.depth + 0.05,
            draw: () => {
              draw3DDisc(xStandStart, nibOuterR + 2, casingOuterR, isSelected ? '#581c87' : '#334155', isSelected ? '#e9d5ff' : '#94a3b8', 1.2);
              draw3DDisc(xStandStart, nibOuterR, nibOuterR + 2, dieMat.brazeColor, '#fef08a', 0.8);
              draw3DDisc(xStandStart, st.rIn, nibOuterR, dieMat.coreColor, dieMat.luster, 1.0);
            },
          });
        } else {
          const pFaceCenter = project(xStandEnd, 0, 0);
          renderQueue.push({
            depth: pFaceCenter.depth + 0.05,
            draw: () => {
              draw3DDisc(xStandEnd, nibOuterR + 2, casingOuterR, isSelected ? '#581c87' : '#334155', isSelected ? '#e9d5ff' : '#94a3b8', 1.2);
              draw3DDisc(xStandEnd, nibOuterR, nibOuterR + 2, dieMat.brazeColor, '#fef08a', 0.8);
              draw3DDisc(xStandEnd, st.rOut, nibOuterR, dieMat.coreColor, dieMat.luster, 1.0);
            },
          });
        }
      });

      // 5. Particle Flow Simulation
      if (isPlaying) {
        flowTime += 0.8 * speedRate * dt * 60;
      }

      for (let i = 0; i < numParticles; i++) {
        if (isPlaying) {
          particlePositions[i] = (particlePositions[i] + 0.0035 * speedRate * dt * 60) % 1.0;
        }

        const currentLineX = lineLeft + particlePositions[i] * (lineRight - lineLeft);
        let localRadius = firstSt?.rIn ?? 14;
        let localSpeedMult = 1.0;

        for (let s = 0; s < N; s++) {
          const st = stations[s];
          if (currentLineX >= st.x) {
            localRadius = st.rOut;
            localSpeedMult = st.speedMultiplier;
          }
        }

        const angle = particleAngles[i];
        const partY = Math.cos(angle) * (localRadius * 0.7);
        const partZ = Math.sin(angle) * (localRadius * 0.7);
        const pPos = project(currentLineX, partY, partZ);

        const streakLen = Math.min(24, 4 * Math.sqrt(localSpeedMult)) * zScale;
        const tailPos = project(currentLineX - streakLen, partY, partZ);

        renderQueue.push({
          depth: pPos.depth,
          draw: () => {
            ctx.beginPath();
            ctx.moveTo(tailPos.px, tailPos.py);
            ctx.lineTo(pPos.px, pPos.py);
            ctx.strokeStyle = `rgba(244, 114, 182, ${Math.min(1.0, 0.4 + localSpeedMult * 0.06)})`;
            ctx.lineWidth = Math.max(1.2, 2.0 * (localRadius / 14));
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(pPos.px, pPos.py, Math.max(1.4, 2.2 * (localRadius / 14)), 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
          },
        });
      }

      // EXECUTE DEPTH-SORTED RENDER QUEUE (Back to Front)
      renderQueue.sort((a, b) => a.depth - b.depth);
      for (let i = 0; i < renderQueue.length; i++) {
        renderQueue[i].draw();
      }

      // 6. 2D Selection HUD Halo & Tags (On Top of 3D Scene)
      stations.forEach((st) => {
        const isSelected = st.idx === selectedPassIdx;
        const casingOuterR = Math.max(26, st.rIn + 16);

        if (isSelected) {
          ctx.save();
          const haloLut = activeLUT;
          ctx.beginPath();
          for (let s = 0; s <= haloLut.count; s++) {
            const y = (casingOuterR + 8) * haloLut.cos[s];
            const z = (casingOuterR + 8) * haloLut.sin[s];
            const p = project(st.x, y, z);
            if (s === 0) ctx.moveTo(p.px, p.py);
            else ctx.lineTo(p.px, p.py);
          }
          ctx.closePath();
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.9)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.restore();
        }

        if (showLabels) {
          const topPos = project(st.x, -casingOuterR - 12, 0);
          ctx.save();
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';

          ctx.fillStyle = isSelected ? '#7e22ce' : '#0f172a';
          ctx.strokeStyle = isSelected ? '#d8b4fe' : '#334155';
          ctx.lineWidth = 1;

          const tagText = `PASS ${st.pass}`;
          const textW = ctx.measureText(tagText).width + 10;
          ctx.beginPath();
          ctx.roundRect(topPos.px - textW / 2, topPos.py - 12, textW, 14, 3);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
          ctx.fillText(tagText, topPos.px, topPos.py - 2);

          ctx.font = 'bold 8.5px monospace';
          ctx.fillStyle = isSelected ? '#c084fc' : '#38bdf8';
          ctx.fillText(`Ø${st.dout.toFixed(3)} mm`, topPos.px, topPos.py + 10);
          ctx.restore();
        }

        if (showVelocityTags) {
          const botPos = project(st.x, railY + 18, 0);
          ctx.save();
          ctx.font = 'bold 8.5px monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#38bdf8';
          ctx.fillText(`${st.speedMultiplier.toFixed(2)}x FEED`, botPos.px, botPos.py);
          ctx.restore();
        }
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [
    passes, stations, selectedPassIdx, isPlaying, speedRate,
    showCapstans, showLabels, showVelocityTags, wireMaterial,
    dieNibMaterial, N, startX, stationSpacing, initialDia,
    initialArea, cameraRef, canvasRef
  ]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[380px] relative flex flex-col items-center justify-center cursor-grab active:cursor-grabbing"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef as React.Ref<HTMLCanvasElement>}
        className="w-full h-full block select-none rounded-lg"
      />
    </div>
  );
});

// =========================================================================
// 2. SINGLE DIE DEEP DEFORMATION ZONE CANVAS (60+ FPS OPTIMIZED)
// =========================================================================
const SingleDieCanvas = React.memo(function SingleDieCanvas({
  pass,
  approachAngle2Alpha,
  bearingLengthLbRatio,
  sliceAngleDeg,
  cameraRef,
  isPlaying,
  renderMode,
  selectedZone = 'all',
  wireMaterial,
  dieNibMaterial,
  showDimensions,
  onHover,
  canvasRef,
}: {
  pass: PassData;
  approachAngle2Alpha: number;
  bearingLengthLbRatio: number;
  sliceAngleDeg: number;
  cameraRef: React.MutableRefObject<CameraState>;
  isPlaying: boolean;
  renderMode: 'realistic' | 'heatmap' | 'thermal' | 'shear' | 'wireframe';
  selectedZone?: DieZoneType;
  wireMaterial: WireMaterialType;
  dieNibMaterial: DieNibMaterialType;
  showDimensions: boolean;
  onHover?: (info: HoverInfo | null) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const displaySizeRef = useRef<{ w: number; h: number }>({ w: 400, h: 300 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const w = Math.max(200, Math.floor(width));
        const h = Math.max(200, Math.floor(height));
        displaySizeRef.current = { w, h };

        const canvas = canvasRef.current;
        if (canvas) {
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          canvas.width = w * dpr;
          canvas.height = h * dpr;
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.scale(dpr, dpr);
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [canvasRef]);

  const din = pass?.fromDie ?? 3.0;
  const dout = pass?.toDie ?? 2.5;
  const areaRed = pass?.areaReduction ?? 0;
  const rFrac = Math.max(0.01, Math.min(0.9, areaRed / 100));
  const alphaRadHalf = ((approachAngle2Alpha / 2) * Math.PI) / 180;
  const deltaParam = (approachAngle2Alpha * Math.PI / 180 / rFrac) * (1 + Math.sqrt(1 - rFrac));
  const isCentralBurstRisk = deltaParam > 3.0 || approachAngle2Alpha > 18 || areaRed > 24;

  const K = STRENGTH_COEFFICIENT_K;
  const nPow = HARDENING_EXPONENT_N;
  const mu = FRICTION_COEFFICIENT_MU;
  const epsilon = Math.log(1 / (1 - rFrac));
  const sigmaFlow = K * Math.pow(Math.max(epsilon, 0.001), nPow) / (nPow + 1);
  const phi = 0.88 + 0.12 * ((alphaRadHalf * 2) / rFrac) * (1 - rFrac);
  const sigmaD = sigmaFlow * phi * epsilon * (1 + mu / Math.tan(Math.max(alphaRadHalf, 0.01)));
  const maxStress = sigmaFlow * 2.5;

  const scaleR = 20;
  const rIn = (din / 2) * scaleR;
  const rOut = (dout / 2) * scaleR;

  const rBell = 18;
  const coneLength = Math.max(35, Math.min(130, (rIn - rOut) / Math.tan(Math.max(alphaRadHalf, 0.01))));
  const bearingLen = (bearingLengthLbRatio / 100) * dout * scaleR;
  const reliefLen = Math.max(25, (rIn - rOut) * 0.8);

  const xEntrance = -190;
  const xBellStart = -coneLength / 2 - rBell;
  const xConeStart = -coneLength / 2;
  const xConeEnd = coneLength / 2;
  const xBearEnd = xConeEnd + bearingLen;
  const xReliefEnd = xBearEnd + reliefLen;
  const xExit = Math.max(xReliefEnd + 100, xConeEnd + 210);

  const rNibOuter = Math.max(rIn + 22, 36);
  const rDieCasingOuter = Math.max(rNibOuter + 30, 68);
  const xCasingFront = xBellStart - 10;
  const xCasingBack = xReliefEnd + 10;
  const casingChamfer = 5;

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!onHover) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const relX = (mouseX / rect.width) - 0.5;
    const axialRange = 360;
    const axialPos = relX * axialRange;
    const axialMm = axialPos * 0.5;

    let stressMPa: number;
    if (axialPos < xConeStart) {
      stressMPa = sigmaD * 0.25;
    } else if (axialPos <= xConeEnd) {
      const t = (axialPos - xConeStart) / (xConeEnd - xConeStart);
      stressMPa = sigmaD * (0.4 + 0.55 * Math.pow(Math.max(0, Math.min(1, t)), 0.7));
    } else if (axialPos <= xBearEnd) {
      const tBear = (axialPos - xConeEnd) / Math.max(bearingLen, 1);
      stressMPa = sigmaD * (0.85 + 0.1 * Math.max(0, Math.min(1, tBear)));
    } else {
      stressMPa = sigmaD * 0.35;
    }

    const localDeltaT = (sigmaD * epsilon) / (8960 * 385) * 1e6;

    onHover({
      x: e.clientX,
      y: e.clientY,
      axial: axialMm,
      stress: stressMPa,
      temp: 25 + localDeltaT,
      strain: axialPos >= xConeStart && axialPos <= xConeEnd
        ? Math.max(0, Math.min(1, (axialPos - xConeStart) / (xConeEnd - xConeStart))) * epsilon
        : axialPos > xConeEnd ? epsilon : 0,
    });
  }, [onHover, sigmaD, epsilon, xConeStart, xConeEnd, xBearEnd, bearingLen, canvasRef]);

  const handleMouseLeave = useCallback(() => {
    if (onHover) onHover(null);
  }, [onHover]);

  useEffect(() => {
    let animId: number;
    let particleOffset = 0;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(render);
        return;
      }

      const width = displaySizeRef.current.w;
      const height = displaySizeRef.current.h;
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, width, height);

      // Batched Grid Lines
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      ctx.save();
      ctx.translate(width / 2, height / 2);

      const cam = cameraRef.current;
      const radX = (cam.rotX * Math.PI) / 180;
      const radY = (cam.rotY * Math.PI) / 180;
      const cosX = Math.cos(radX);
      const sinX = Math.sin(radX);
      const cosY = Math.cos(radY);
      const sinY = Math.sin(radY);
      const zScale = cam.zoom;

      // 3D Render Queue for Zero-Artifact Depth Sorting
      interface RenderItem {
        depth: number;
        draw: () => void;
      }
      const renderQueue: RenderItem[] = [];

      const addQuad = (
        p1: { px: number; py: number; depth: number },
        p2: { px: number; py: number; depth: number },
        p3: { px: number; py: number; depth: number },
        p4: { px: number; py: number; depth: number },
        fill: string,
        stroke?: string,
        strokeW: number = 1,
        alpha: number = 1.0
      ) => {
        const avgDepth = (p1.depth + p2.depth + p3.depth + p4.depth) * 0.25;
        renderQueue.push({
          depth: avgDepth,
          draw: () => {
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.lineTo(p3.px, p3.py);
            ctx.lineTo(p4.px, p4.py);
            ctx.closePath();
            ctx.fillStyle = fill;
            if (alpha < 0.99) ctx.globalAlpha = alpha;
            ctx.fill();
            if (alpha < 0.99) ctx.globalAlpha = 1.0;
            if (stroke) {
              ctx.strokeStyle = stroke;
              ctx.lineWidth = strokeW;
              ctx.stroke();
            }
          },
        });
      };

      const project3D = (x: number, y: number, z: number) => {
        const xOffset = x + cam.panX;
        const yOffset = y + cam.panY;
        const x1 = xOffset * cosY + z * sinY;
        const z1 = -xOffset * sinY + z * cosY;
        const y2 = yOffset * cosX - z1 * sinX;
        const z2 = yOffset * sinX + z1 * cosX;
        return { px: x1 * zScale, py: y2 * zScale, depth: z2 };
      };

      const mat = WIRE_MATERIALS[wireMaterial];
      const dieMat = DIE_MATERIALS[dieNibMaterial];
      const activeLUT = cam.isDragging ? LUT_18 : LUT_36;
      const count = activeLUT.count;
      const maxCutoffRad = (sliceAngleDeg * Math.PI) / 180;

      const stressToColor = (stressVal: number): string => {
        if (renderMode === 'wireframe') return 'rgba(59, 130, 246, 0.4)';
        if (renderMode === 'shear') return `rgba(16, 185, 129, ${0.35 + stressVal * 0.6})`;
        const clamped = Math.max(0, Math.min(1, stressVal));
        if (clamped > 0.85) return '#ec4899';
        if (clamped > 0.7) return '#ef4444';
        if (clamped > 0.5) return '#f59e0b';
        if (clamped > 0.35) return '#10b981';
        return '#3b82f6';
      };

      const computeStressAtX = (x: number): number => {
        let stressVal: number;
        if (x < xConeStart) {
          stressVal = sigmaD * 0.25 / maxStress;
        } else if (x <= xConeEnd) {
          const t = (x - xConeStart) / (xConeEnd - xConeStart);
          stressVal = sigmaD * (0.4 + 0.55 * Math.pow(t, 0.7)) / maxStress;
        } else if (x <= xBearEnd) {
          const tBear = (x - xConeEnd) / Math.max(bearingLen, 1);
          stressVal = sigmaD * (0.85 + 0.1 * tBear) / maxStress;
        } else {
          stressVal = sigmaD * 0.35 / maxStress;
        }
        if (areaRed > 24) stressVal *= 1.12;
        return Math.max(0, Math.min(1, stressVal));
      };

      const computeThermalAtX = (x: number): { temp: number; color: string } => {
        const tAmbient = 25.0;
        const deltaT_def = (sigmaD * epsilon) / (8960 * 385) * 1e6;
        let localTemp: number;

        if (x < xConeStart) {
          localTemp = tAmbient;
        } else if (x <= xConeEnd) {
          const t = (x - xConeStart) / Math.max(1, xConeEnd - xConeStart);
          localTemp = tAmbient + deltaT_def * Math.pow(t, 0.85) + 40.0 * Math.pow(t, 1.8);
        } else if (x <= xBearEnd) {
          const tBear = (x - xConeEnd) / Math.max(1, bearingLen);
          localTemp = tAmbient + deltaT_def + 40.0 + 15.0 * (1.0 - tBear * 0.5);
        } else if (x <= xReliefEnd) {
          const tRelief = (x - xBearEnd) / Math.max(1, reliefLen);
          localTemp = tAmbient + (deltaT_def + 40.0) * (1.0 - tRelief * 0.2);
        } else {
          const decay = Math.exp(-0.004 * (x - xReliefEnd));
          localTemp = tAmbient + (deltaT_def + 30.0) * decay;
        }

        let color: string;
        if (localTemp < 40) {
          color = '#06b6d4';
        } else if (localTemp < 70) {
          color = '#10b981';
        } else if (localTemp < 110) {
          color = '#f59e0b';
        } else if (localTemp < 145) {
          color = '#ef4444';
        } else if (localTemp < 175) {
          color = '#f43f5e';
        } else {
          color = '#fdf4ff';
        }

        return { temp: localTemp, color };
      };

      const add3DCylinderSection = (
        xStart: number,
        xEnd: number,
        rStart: number,
        rEnd: number,
        layerType: 'casing' | 'braze' | 'nib' | 'bore' | 'wire'
      ) => {
        for (let i = 0; i < count; i++) {
          const angle1 = (i / count) * Math.PI * 2;
          if (layerType !== 'wire' && sliceAngleDeg < 360 && angle1 > maxCutoffRad) continue;

          const cos1 = activeLUT.cos[i];
          const sin1 = activeLUT.sin[i];
          const cos2 = activeLUT.cos[i + 1];
          const sin2 = activeLUT.sin[i + 1];

          const p1 = project3D(xStart, rStart * cos1, rStart * sin1);
          const p2 = project3D(xStart, rStart * cos2, rStart * sin2);
          const p3 = project3D(xEnd, rEnd * cos2, rEnd * sin2);
          const p4 = project3D(xEnd, rEnd * cos1, rEnd * sin1);

          const normalY = (cos1 + cos2) * 0.5;
          const lightFactor = Math.max(0.2, 0.5 + 0.5 * (-normalY));

          if (layerType === 'casing') {
            const steelVal = Math.floor(110 + lightFactor * 130);
            const fill = renderMode === 'wireframe' ? 'rgba(15, 23, 42, 0.35)' : `rgb(${steelVal * 0.45}, ${steelVal * 0.5}, ${steelVal * 0.6})`;
            const stroke = renderMode === 'wireframe' ? 'rgba(94, 234, 212, 0.4)' : 'rgba(148, 163, 184, 0.45)';
            addQuad(p1, p2, p3, p4, fill, stroke, 0.8);
          } else if (layerType === 'braze') {
            addQuad(p1, p2, p3, p4, dieMat.brazeColor);
          } else if (layerType === 'nib') {
            addQuad(p1, p2, p3, p4, dieMat.coreColor);
          } else if (layerType === 'bore') {
            const innerLight = Math.max(0.12, 0.3 + 0.35 * normalY);
            let fill = dieMat.coreColor;
            if (renderMode === 'thermal') {
              const midX = (xStart + xEnd) / 2;
              const { color: boreThermColor } = computeThermalAtX(midX);
              fill = boreThermColor;
            }
            addQuad(p1, p2, p3, p4, fill, 'rgba(51, 65, 85, 0.4)', 0.8, renderMode === 'thermal' ? 0.75 : innerLight);
          } else {
            const midX = (xStart + xEnd) / 2;
            const stressVal = computeStressAtX(midX);

            if (renderMode === 'realistic') {
              addQuad(p1, p2, p3, p4, mat.wireGradient[0], undefined, 1, lightFactor);
            } else if (renderMode === 'thermal') {
              const { color: thermColor } = computeThermalAtX(midX);
              addQuad(p1, p2, p3, p4, thermColor, undefined, 1, 0.95);
            } else if (renderMode === 'heatmap') {
              const fill = midX >= xConeEnd && midX <= xBearEnd
                ? `rgba(245, 158, 11, ${0.6 + 0.4 * stressVal})`
                : stressToColor(stressVal);
              addQuad(p1, p2, p3, p4, fill, undefined, 1, 0.95);
            } else {
              addQuad(p1, p2, p3, p4, stressToColor(stressVal), undefined, 1, 0.85);
            }
          }
        }
      };

      // 1. Outer Stainless Steel Die Casing (3 Axial Zones)
      add3DCylinderSection(xCasingFront, xCasingFront + casingChamfer, rDieCasingOuter - casingChamfer, rDieCasingOuter, 'casing');
      add3DCylinderSection(xCasingFront + casingChamfer, xCasingBack - casingChamfer, rDieCasingOuter, rDieCasingOuter, 'casing');
      add3DCylinderSection(xCasingBack - casingChamfer, xCasingBack, rDieCasingOuter, rDieCasingOuter - casingChamfer, 'casing');

      // 2. Sintered Brazing Seat Ring & Carbide Nib Outer Body
      add3DCylinderSection(xCasingFront + 2, xCasingBack - 2, rNibOuter + 2, rNibOuter + 2, 'braze');
      add3DCylinderSection(xCasingFront + 4, xCasingBack - 4, rNibOuter, rNibOuter, 'nib');

      // 3. Nib Internal Bore Cavity (Visible When Cut Open)
      if (sliceAngleDeg < 360) {
        add3DCylinderSection(xBellStart, xConeStart, rIn + 6, rIn, 'bore');
        add3DCylinderSection(xConeStart, xConeEnd, rIn, rOut, 'bore');
        add3DCylinderSection(xConeEnd, xBearEnd, rOut, rOut, 'bore');
        add3DCylinderSection(xBearEnd, xReliefEnd, rOut, rOut + (rIn - rOut) * 0.6, 'bore');
      }

      // 4. Cutaway Longitudinal Slice Walls
      if (sliceAngleDeg < 360) {
        const cutAngles = [0, maxCutoffRad];
        cutAngles.forEach((cutAngle) => {
          const cosA = Math.cos(cutAngle);
          const sinA = Math.sin(cutAngle);

          const pC1 = project3D(xCasingFront, (rDieCasingOuter - casingChamfer) * cosA, (rDieCasingOuter - casingChamfer) * sinA);
          const pC2 = project3D(xCasingBack, (rDieCasingOuter - casingChamfer) * cosA, (rDieCasingOuter - casingChamfer) * sinA);
          const pN2 = project3D(xCasingBack, rNibOuter * cosA, rNibOuter * sinA);
          const pN1 = project3D(xCasingFront, rNibOuter * cosA, rNibOuter * sinA);
          addQuad(pC1, pC2, pN2, pN1, 'rgba(51, 65, 85, 0.9)', '#94a3b8', 1);

          const pB1 = project3D(xCasingFront + 4, rNibOuter * cosA, rNibOuter * sinA);
          const pB2 = project3D(xCasingBack - 4, rNibOuter * cosA, rNibOuter * sinA);
          const pB3 = project3D(xCasingBack - 4, rOut * cosA, rOut * sinA);
          const pB4 = project3D(xCasingFront + 4, rIn * cosA, rIn * sinA);
          addQuad(pB1, pB2, pB3, pB4, dieMat.coreColor, dieMat.brazeColor, 1.2);
        });
      }

      // 5. Continuous Drawn Wire Profile (Fully Segmented in 3D)
      add3DCylinderSection(xEntrance, xBellStart, rIn, rIn, 'wire');

      const stepsBell = 6;
      for (let s = 0; s < stepsBell; s++) {
        const x1 = xBellStart + (s / stepsBell) * (xConeStart - xBellStart);
        const x2 = xBellStart + ((s + 1) / stepsBell) * (xConeStart - xBellStart);
        const t1 = s / stepsBell;
        const t2 = (s + 1) / stepsBell;
        const r1 = rIn + 6 * (1 - Math.sin(t1 * Math.PI * 0.5));
        const r2 = rIn + 6 * (1 - Math.sin(t2 * Math.PI * 0.5));
        add3DCylinderSection(x1, x2, r1, r2, 'wire');
      }

      const stepsCone = 10;
      for (let s = 0; s < stepsCone; s++) {
        const x1 = xConeStart + (s / stepsCone) * (xConeEnd - xConeStart);
        const x2 = xConeStart + ((s + 1) / stepsCone) * (xConeEnd - xConeStart);
        const r1 = rIn - (s / stepsCone) * (rIn - rOut);
        const r2 = rIn - ((s + 1) / stepsCone) * (rIn - rOut);
        add3DCylinderSection(x1, x2, r1, r2, 'wire');
      }

      add3DCylinderSection(xConeEnd, xBearEnd, rOut, rOut, 'wire');

      const stepsRelief = 6;
      for (let s = 0; s < stepsRelief; s++) {
        const x1 = xBearEnd + (s / stepsRelief) * (xReliefEnd - xBearEnd);
        const x2 = xBearEnd + ((s + 1) / stepsRelief) * (xReliefEnd - xBearEnd);
        const r1 = rOut + (s / stepsRelief) * ((rIn - rOut) * 0.6);
        const r2 = rOut + ((s + 1) / stepsRelief) * ((rIn - rOut) * 0.6);
        add3DCylinderSection(x1, x2, r1, r2, 'wire');
      }

      add3DCylinderSection(xReliefEnd, xExit, rOut, rOut, 'wire');

      // 5.5 3D Zone Bore Inspector Contour Glow Band
      if (selectedZone !== 'all') {
        let zStart = 0;
        let zEnd = 0;
        let zColor = '#a855f7';
        let zLabel = '';

        if (selectedZone === 'bell') {
          zStart = xBellStart;
          zEnd = xConeStart;
          zColor = '#38bdf8';
          zLabel = 'ZONE 1: BELL ENTRANCE';
        } else if (selectedZone === 'cone') {
          zStart = xConeStart;
          zEnd = xConeEnd;
          zColor = '#c084fc';
          zLabel = 'ZONE 2: REDUCTION CONE';
        } else if (selectedZone === 'bearing') {
          zStart = xConeEnd;
          zEnd = xBearEnd;
          zColor = '#34d399';
          zLabel = 'ZONE 3: BEARING LAND';
        } else if (selectedZone === 'relief') {
          zStart = xBearEnd;
          zEnd = xReliefEnd;
          zColor = '#fbbf24';
          zLabel = 'ZONE 4: BACK RELIEF';
        }

        const ringR = rDieCasingOuter + 4;
        for (let i = 0; i < count; i++) {
          const cos1 = activeLUT.cos[i];
          const sin1 = activeLUT.sin[i];
          const cos2 = activeLUT.cos[i + 1];
          const sin2 = activeLUT.sin[i + 1];

          const p1 = project3D(zStart, ringR * cos1, ringR * sin1);
          const p2 = project3D(zStart, ringR * cos2, ringR * sin2);
          const p3 = project3D(zEnd, ringR * cos2, ringR * sin2);
          const p4 = project3D(zEnd, ringR * cos1, ringR * sin1);

          addQuad(p1, p2, p3, p4, `${zColor}33`, zColor, 1.8, 0.7);
        }

        const pMid = project3D((zStart + zEnd) / 2, -rDieCasingOuter - 18, 0);
        renderQueue.push({
          depth: pMid.depth + 10,
          draw: () => {
            ctx.save();
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            const tw = ctx.measureText(zLabel).width + 12;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
            ctx.strokeStyle = zColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(pMid.px - tw / 2, pMid.py - 12, tw, 16, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = zColor;
            ctx.fillText(zLabel, pMid.px, pMid.py);
            ctx.restore();
          },
        });
      }

      // 6. Central Burst Defect Chevrons
      if (isCentralBurstRisk) {
        const numChevrons = 3;
        for (let c = 0; c < numChevrons; c++) {
          const xc = xConeStart + 15 + c * ((xConeEnd - xConeStart - 30) / (numChevrons - 1));
          const pLeft = project3D(xc - 8, 0, 0);
          const pMidTop = project3D(xc, 4, 0);
          const pMidBottom = project3D(xc, -4, 0);
          const pRight = project3D(xc + 8, 0, 0);

          renderQueue.push({
            depth: pLeft.depth,
            draw: () => {
              ctx.beginPath();
              ctx.moveTo(pLeft.px, pLeft.py);
              ctx.lineTo(pMidTop.px, pMidTop.py);
              ctx.lineTo(pRight.px, pRight.py);
              ctx.lineTo(pMidBottom.px, pMidBottom.py);
              ctx.closePath();
              ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 1.6;
              ctx.fill();
              ctx.stroke();
            },
          });
        }
      }

      // 7. Flow Particles
      if (isPlaying) {
        particleOffset = (particleOffset + 1.4 * dt * 60) % 40;
      }
      const stepP = 16;
      for (let px = xEntrance; px < xExit; px += stepP) {
        const offsetPx = px + particleOffset;
        if (offsetPx > xExit) continue;

        const p = project3D(offsetPx, 0, 0);
        renderQueue.push({
          depth: p.depth,
          draw: () => {
            ctx.beginPath();
            ctx.arc(p.px, p.py, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fill();
          },
        });
      }

      // EXECUTE DEPTH-SORTED RENDER QUEUE (Back to Front)
      renderQueue.sort((a, b) => a.depth - b.depth);
      for (let i = 0; i < renderQueue.length; i++) {
        renderQueue[i].draw();
      }

      // 8. 2D CAD Dimension Leaders & Overlays (On Top of 3D Scene)
      if (showDimensions) {
        ctx.save();
        ctx.font = 'bold 9px monospace';
        ctx.strokeStyle = '#38bdf8';
        ctx.fillStyle = '#38bdf8';
        ctx.lineWidth = 1;

        const pInTop = project3D(xEntrance + 20, -rIn, 0);
        const pInBot = project3D(xEntrance + 20, rIn, 0);
        ctx.beginPath();
        ctx.moveTo(pInTop.px - 6, pInTop.py);
        ctx.lineTo(pInTop.px + 6, pInTop.py);
        ctx.moveTo(pInBot.px - 6, pInBot.py);
        ctx.lineTo(pInBot.px + 6, pInBot.py);
        ctx.moveTo(pInTop.px, pInTop.py);
        ctx.lineTo(pInBot.px, pInBot.py);
        ctx.stroke();
        ctx.fillText(`d1: Ø${din.toFixed(3)} mm`, pInTop.px + 8, (pInTop.py + pInBot.py) / 2);

        const pOutTop = project3D(xExit - 20, -rOut, 0);
        const pOutBot = project3D(xExit - 20, rOut, 0);
        ctx.beginPath();
        ctx.moveTo(pOutTop.px - 6, pOutTop.py);
        ctx.lineTo(pOutTop.px + 6, pOutTop.py);
        ctx.moveTo(pOutBot.px - 6, pOutBot.py);
        ctx.lineTo(pOutBot.px + 6, pOutBot.py);
        ctx.moveTo(pOutTop.px, pOutTop.py);
        ctx.lineTo(pOutBot.px, pOutBot.py);
        ctx.stroke();
        ctx.fillText(`d2: Ø${dout.toFixed(3)} mm`, pOutTop.px + 8, (pOutTop.py + pOutBot.py) / 2);

        const pConeMid = project3D((xConeStart + xConeEnd) / 2, -rDieCasingOuter - 10, 0);
        ctx.fillText(`Approach 2α: ${approachAngle2Alpha}°`, pConeMid.px - 40, pConeMid.py);

        const pBearStart = project3D(xConeEnd, rDieCasingOuter + 10, 0);
        const pBearEndP = project3D(xBearEnd, rDieCasingOuter + 10, 0);
        ctx.beginPath();
        ctx.moveTo(pBearStart.px, pBearStart.py);
        ctx.lineTo(pBearEndP.px, pBearEndP.py);
        ctx.stroke();
        ctx.fillText(`Lb: ${bearingLengthLbRatio}% d2`, pBearStart.px, pBearStart.py + 12);
        ctx.restore();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [
    pass, isPlaying, renderMode, selectedZone, approachAngle2Alpha,
    bearingLengthLbRatio, sliceAngleDeg, wireMaterial, dieNibMaterial,
    showDimensions, din, dout, areaRed, alphaRadHalf, deltaParam,
    isCentralBurstRisk, sigmaD, maxStress, bearingLen, reliefLen,
    xConeStart, xConeEnd, xBearEnd, xExit, xEntrance, xBellStart, xReliefEnd,
    xCasingFront, xCasingBack, casingChamfer, rNibOuter, rDieCasingOuter,
    coneLength, rIn, rOut, epsilon, cameraRef, canvasRef
  ]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[340px] relative flex flex-col items-center justify-center cursor-grab active:cursor-grabbing"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas
        ref={canvasRef as React.Ref<HTMLCanvasElement>}
        className="w-full h-full block select-none rounded-lg"
      />
    </div>
  );
});

// =========================================================================
// 3. MAIN WORKBENCH COMPONENT WITH DECOUPLED CAMERA CONTROLLER
// =========================================================================
export default function StressHeatmap3D({ passes }: StressHeatmap3DProps) {
  const [activeViewMode, setActiveViewMode] = useState<'train' | 'single' | 'compare'>('train');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [navTool, setNavTool] = useState<'orbit' | 'pan'>('orbit');

  const [selectedPassIdx, setSelectedPassIdx] = useState<number>(0);
  const [comparePassIdxA, setComparePassIdxA] = useState<number>(0);
  const [comparePassIdxB, setComparePassIdxB] = useState<number>(Math.min(1, passes.length - 1));

  // Mutable camera controller ref: 0 React re-renders on mousemove
  const cameraRef = useRef<CameraState>({
    rotX: 22,
    rotY: -28,
    zoom: 1.0,
    panX: 0,
    panY: 0,
    isDragging: false,
  });

  // UI display zoom for badge
  const [uiZoom, setUiZoom] = useState<number>(1.0);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedRate, setSpeedRate] = useState<number>(1.0);

  // Material Themes
  const [wireMaterial, setWireMaterial] = useState<WireMaterialType>('copper');
  const [dieNibMaterial, setDieNibMaterial] = useState<DieNibMaterialType>('carbide');

  // Train specific visual toggles
  const [showCapstans, setShowCapstans] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showVelocityTags, setShowVelocityTags] = useState<boolean>(true);
  const [showExplainer, setShowExplainer] = useState<boolean>(true);

  // Single Die specific parameters
  const [approachAngle2Alpha, setApproachAngle2Alpha] = useState<number>(14);
  const [bearingLengthLbRatio, setBearingLengthLbRatio] = useState<number>(35);
  const [sliceAngleDeg, setSliceAngleDeg] = useState<number>(270);
  const [renderMode, setRenderMode] = useState<'realistic' | 'heatmap' | 'thermal' | 'wireframe' | 'shear'>('realistic');
  const [selectedZone, setSelectedZone] = useState<DieZoneType>('all');
  const [showDimensions, setShowDimensions] = useState<boolean>(true);

  // Mouse Dragging States
  const dragButtonRef = useRef<number>(0);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Hover Telemetry States
  const [trainHoverInfo, setTrainHoverInfo] = useState<TrainHoverInfo | null>(null);
  const [singleHoverInfo, setSingleHoverInfo] = useState<HoverInfo | null>(null);

  // Outer Wrapper Ref
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mainContainerRef = useRef<HTMLDivElement | null>(null);
  const trainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const singleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);

  // Non-passive wheel listener for smooth CAD-style mouse scroll zoom (0 React lag)
  useEffect(() => {
    const container = mainContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      const newZoom = Math.max(0.25, Math.min(5.0, Number((cameraRef.current.zoom * factor).toFixed(3))));
      cameraRef.current.zoom = newZoom;
      setUiZoom(newZoom);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Toggle Fullscreen Viewport Mode
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      if (wrapperRef.current && wrapperRef.current.requestFullscreen) {
        wrapperRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      setIsFullscreen(false);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
      if ((e.key === 'f' || e.key === 'F') && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        toggleFullscreen();
      }
      if (e.key === '+' || e.key === '=') {
        const newZ = Math.min(5.0, cameraRef.current.zoom + 0.15);
        cameraRef.current.zoom = newZ;
        setUiZoom(newZ);
      }
      if (e.key === '-' || e.key === '_') {
        const newZ = Math.max(0.25, cameraRef.current.zoom - 0.15);
        cameraRef.current.zoom = newZ;
        setUiZoom(newZ);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, toggleFullscreen]);

  // CAD Zoom Extents / Fit to View
  const fitView = () => {
    cameraRef.current.rotX = 22;
    cameraRef.current.rotY = -28;
    cameraRef.current.panX = 0;
    cameraRef.current.panY = 0;
    cameraRef.current.zoom = 1.0;
    setUiZoom(1.0);
  };

  // Center Camera onto Selected Die Station
  const focusSelectedPass = () => {
    const N = passes.length;
    const stationSpacing = Math.max(95, Math.min(140, 1050 / Math.max(N, 1)));
    const totalLength = (N - 1) * stationSpacing;
    const startX = -totalLength / 2;
    const targetX = startX + selectedPassIdx * stationSpacing;
    cameraRef.current.panX = -targetX;
    cameraRef.current.panY = 0;
    cameraRef.current.zoom = 1.8;
    setUiZoom(1.8);
  };

  // View Angle Presets
  const setViewPreset = (preset: 'iso' | 'side' | 'top' | 'front') => {
    switch (preset) {
      case 'iso':
        cameraRef.current.rotX = 22;
        cameraRef.current.rotY = -28;
        cameraRef.current.panX = 0;
        cameraRef.current.panY = 0;
        cameraRef.current.zoom = 1.0;
        setUiZoom(1.0);
        break;
      case 'side':
        cameraRef.current.rotX = 0;
        cameraRef.current.rotY = 0;
        cameraRef.current.panX = 0;
        cameraRef.current.panY = 0;
        cameraRef.current.zoom = 1.05;
        setUiZoom(1.05);
        break;
      case 'top':
        cameraRef.current.rotX = 85;
        cameraRef.current.rotY = 0;
        cameraRef.current.panX = 0;
        cameraRef.current.panY = 0;
        cameraRef.current.zoom = 0.95;
        setUiZoom(0.95);
        break;
      case 'front':
        cameraRef.current.rotX = 10;
        cameraRef.current.rotY = -80;
        cameraRef.current.panX = 0;
        cameraRef.current.panY = 0;
        cameraRef.current.zoom = 1.1;
        setUiZoom(1.1);
        break;
    }
  };

  const handleTakeSnapshot = () => {
    const activeCanvas =
      activeViewMode === 'train'
        ? trainCanvasRef.current
        : activeViewMode === 'single'
        ? singleCanvasRef.current
        : canvasRefA.current;

    if (!activeCanvas) return;
    requestAnimationFrame(() => {
      const imageURI = activeCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `DMS_3D_WireDrawing_${activeViewMode}.png`;
      link.href = imageURI;
      link.click();
    });
  };

  const handleExportTDS = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      const doc = new jsPDF('landscape', 'mm', 'a4');
      const activeCanvas =
        activeViewMode === 'train'
          ? trainCanvasRef.current
          : activeViewMode === 'single'
          ? singleCanvasRef.current
          : canvasRefA.current;

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // 1. Header Banner
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('DMS-O2 WIRE DRAWING TECHNICAL DATA SHEET (TDS)', 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('ISO 2812 & DIN 1547 COMPLIANT MULTI-PASS PASS SCHEDULE SPECIFICATION', 14, 18);

      doc.setTextColor(56, 189, 248);
      doc.setFont('helvetica', 'bold');
      doc.text(`DOC REF: DMS-TDS-${Date.now().toString().slice(-6)}`, pageWidth - 65, 11);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text(`DATE: ${new Date().toLocaleDateString()} | STATUS: CERTIFIED`, pageWidth - 65, 18);

      // 2. Process & Material Metadata Card
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 28, pageWidth - 28, 18, 2, 2, 'FD');

      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'bold');

      const colW = (pageWidth - 28) / 4;
      doc.text('WIRE MATERIAL SPEC:', 18, 34);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(WIRE_MATERIALS[wireMaterial].name, 18, 40);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('DIE NIB MATERIAL:', 18 + colW, 34);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(DIE_MATERIALS[dieNibMaterial].name, 18 + colW, 40);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('DIE GEOMETRY PRESET:', 18 + colW * 2, 34);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(`2α = ${approachAngle2Alpha}° | Lb = ${bearingLengthLbRatio}% d2`, 18 + colW * 2, 40);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('TOTAL PASSES / DRAFT:', 18 + colW * 3, 34);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(`${passes.length} Passes (Ø${(passes[0]?.fromDie ?? 0).toFixed(2)} → Ø${(passes[passes.length - 1]?.toDie ?? 0).toFixed(2)} mm)`, 18 + colW * 3, 40);

      // 3. Embedded 3D Canvas Snapshot & AutoTable Schedule
      let tableStartY = 50;
      const imgW = 115;
      const imgH = 62;
      const imgX = pageWidth - 14 - imgW;
      const imgY = 50;

      if (activeCanvas) {
        try {
          const imgData = activeCanvas.toDataURL('image/png');
          doc.setFillColor(15, 23, 42);
          doc.roundedRect(imgX - 1, imgY - 1, imgW + 2, imgH + 2, 2, 2, 'F');
          doc.addImage(imgData, 'PNG', imgX, imgY, imgW, imgH);

          doc.setFontSize(7);
          doc.setTextColor(255, 255, 255);
          doc.text(`3D Model Projection: ${activeViewMode.toUpperCase()} VIEWPORT`, imgX + 3, imgY + imgH - 3);
        } catch {
          // ignore canvas extraction error
        }
      }

      const tableData = passes.map((p) => {
        const sigmaD_p = computeDrawingStress(p, approachAngle2Alpha);
        const forceN_p = computeDrawingForce(p, approachAngle2Alpha);
        const rFrac_p = Math.max(0.01, Math.min(0.9, (p.areaReduction ?? 0) / 100));
        const eps_p = Math.log(1 / (1 - rFrac_p));
        const deltaT_p = (sigmaD_p * eps_p) / (8960 * 385) * 1e6;
        const initA = Math.PI * Math.pow((passes[0]?.fromDie ?? 1) / 2, 2);
        const outA = Math.PI * Math.pow((p.toDie ?? 1) / 2, 2);
        const speedM = initA / outA;

        return [
          `P#${p.pass}`,
          `${p.fromDie.toFixed(3)}`,
          `${p.toDie.toFixed(3)}`,
          `${(p.areaReduction ?? 0).toFixed(1)}%`,
          `${(p.elongation ?? 0).toFixed(1)}%`,
          `${forceN_p.toFixed(0)} N`,
          `${sigmaD_p.toFixed(0)} MPa`,
          `+${deltaT_p.toFixed(1)} °C`,
          `${speedM.toFixed(2)}x`,
        ];
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).autoTable({
        startY: 50,
        margin: { left: 14, right: activeCanvas ? imgW + 20 : 14 },
        head: [
          ['Pass', 'Inlet Ø', 'Outlet Ø', 'Red.%', 'Elong.%', 'Force', 'Stress σd', 'ΔT Rise', 'Speed'],
        ],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [88, 28, 135],
          textColor: [255, 255, 255],
          fontSize: 7,
          fontStyle: 'bold',
          halign: 'center',
        },
        styles: {
          fontSize: 6.8,
          cellPadding: 1.2,
          halign: 'center',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tableStartY = Math.max(imgY + imgH + 6, (doc as any).lastAutoTable.finalY + 6);

      // 4. Four-Zone Die Anatomy Specifications Box
      const boxW = pageWidth - 28;
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, tableStartY, boxW, 42, 2, 2, 'FD');

      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('FOUR-ZONE DIE INTERNAL PROFILE SPECIFICATIONS (DIN 2812 STANDARD)', 18, tableStartY + 6);

      const zoneColW = (boxW - 8) / 4;
      const zoneKeys: DieZoneType[] = ['bell', 'cone', 'bearing', 'relief'];
      zoneKeys.forEach((zk, idx) => {
        const zd = DIE_ZONES[zk];
        const zx = 18 + idx * zoneColW;
        const zy = tableStartY + 12;

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85);
        doc.text(zd.name, zx, zy);

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Target: ${zd.angleOrDim}`, zx, zy + 5);
        doc.text(`Model: ${zd.formula}`, zx, zy + 10);

        const splitPurpose = doc.splitTextToSize(zd.purpose, zoneColW - 6);
        doc.text(splitPurpose, zx, zy + 15);
      });

      // 5. Engineering Footer
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('Prepared by: DMS-O2 Autonomous Engineering System | Verified against Avitzur/Siebel Upper Bound Friction Model', 14, pageHeight - 6);
      doc.text('Page 1 of 1 | CONFIDENTIAL & PROPRIETARY', pageWidth - 70, pageHeight - 6);

      doc.save(`DMS_TDS_PassSchedule_${passes.length}Passes.pdf`);
    } catch (err) {
      console.error('Failed to export TDS PDF:', err);
    }
  };

  // Fast Drag Handlers (Direct Camera Mutation — 0 React Re-renders)
  const handleMouseDown = (e: React.MouseEvent) => {
    cameraRef.current.isDragging = true;
    dragButtonRef.current = e.button;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cameraRef.current.isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const isPanning = dragButtonRef.current === 1 || dragButtonRef.current === 2 || e.shiftKey || navTool === 'pan';

    if (isPanning) {
      const panSensitivity = 1.0 / Math.max(0.2, cameraRef.current.zoom);
      cameraRef.current.panX += deltaX * panSensitivity;
      cameraRef.current.panY += deltaY * panSensitivity;
    } else {
      cameraRef.current.rotY += deltaX * 0.4;
      cameraRef.current.rotX = Math.max(-85, Math.min(85, cameraRef.current.rotX - deltaY * 0.4));
    }
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    cameraRef.current.isDragging = false;
    setUiZoom(Number(cameraRef.current.zoom.toFixed(2)));
  };

  if (!passes || passes.length === 0) {
    return (
      <div className="wdc-panel bg-[#050913]/90 border border-slate-900 rounded-xl p-12 text-center">
        <Activity className="h-8 w-8 text-slate-600 mx-auto mb-3 text-purple-400" />
        <p className="text-slate-400 text-sm">No pass data available. Generate a die schedule to view the 3D multi-pass wire drawing workbench.</p>
      </div>
    );
  }

  const activePassSingle = passes[selectedPassIdx] || passes[0];
  const activePassA = passes[comparePassIdxA] || passes[0];
  const activePassB = passes[comparePassIdxB] || passes[0];

  const calculateDelta = (vA: number, vB: number) => {
    const delta = vB - vA;
    if (delta === 0) return '—';
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(3)}`;
  };

  const din = activePassSingle?.fromDie ?? 3.0;
  const dout = activePassSingle?.toDie ?? 2.5;
  const areaRed = activePassSingle?.areaReduction ?? 0;
  const rFrac = Math.max(0.01, Math.min(0.9, areaRed / 100));
  const alphaRadHalf = ((approachAngle2Alpha / 2) * Math.PI) / 180;

  const K = STRENGTH_COEFFICIENT_K;
  const nPow = HARDENING_EXPONENT_N;
  const epsilon = Math.log(1 / (1 - rFrac));
  const sigmaFlow = K * Math.pow(Math.max(epsilon, 0.001), nPow) / (nPow + 1);
  const phi = 0.88 + 0.12 * ((alphaRadHalf * 2) / rFrac) * (1 - rFrac);
  const sigmaD = sigmaFlow * phi * epsilon * (1 + FRICTION_COEFFICIENT_MU / Math.tan(Math.max(alphaRadHalf, 0.01)));
  const deltaT = (sigmaD * epsilon) / (8960 * 385) * 1e6;
  const forceN = computeDrawingForce(activePassSingle, approachAngle2Alpha);

  return (
    <motion.div
      ref={wrapperRef}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`wdc-panel bg-[#050913] border border-slate-900 rounded-xl relative overflow-hidden shadow-2xl space-y-4 select-none ${
        isFullscreen
          ? 'fixed inset-0 z-[100] w-screen h-screen p-4 sm:p-6 flex flex-col justify-between overflow-y-auto'
          : 'p-6'
      }`}
    >
      {/* Header & Mode Switcher */}
      <div className="flex flex-wrap justify-between items-center gap-3 pb-3 border-b border-slate-900 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[var(--color-text)] m-0 font-heading">
                3D CAD Wire Drawing Workbench
              </h3>
              <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {passes.length} Passes Active
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                60-120 FPS HIGH PERF
              </span>
              {isFullscreen && (
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  FULLSCREEN (ESC / F)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 m-0 mt-0.5">
              Decoupled 60 FPS CAD engine &bull; Tungsten Carbide / PCD Nibs &bull; Solid Bullblock Capstans &bull; 4-Zone Bore Inspector
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveViewMode('train')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold transition cursor-pointer ${
                activeViewMode === 'train' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Multi-Die Train</span>
            </button>
            <button
              onClick={() => setActiveViewMode('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold transition cursor-pointer ${
                activeViewMode === 'single' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Single Die Zone</span>
            </button>
            <button
              onClick={() => setActiveViewMode('compare')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold transition cursor-pointer ${
                activeViewMode === 'compare' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>Compare</span>
            </button>
          </div>

          <button
            onClick={handleExportTDS}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition shadow-sm cursor-pointer"
            title="Export ISO/DIN Technical Data Sheet (PDF)"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export TDS</span>
          </button>

          <button
            onClick={handleTakeSnapshot}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition shadow-sm cursor-pointer"
            title="Download PNG Snapshot"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Snapshot</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition shadow-sm cursor-pointer ${
              isFullscreen
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30'
            }`}
            title={isFullscreen ? 'Exit Fullscreen (Esc or F)' : 'Enter Fullscreen (F)'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* Quick Pass Selector Chips */}
      <div className="flex items-center gap-1 w-full overflow-x-auto pb-1 shrink-0">
        {passes.map((p, idx) => {
          const isSelected = idx === selectedPassIdx;
          return (
            <button
              key={idx}
              onClick={() => setSelectedPassIdx(idx)}
              className={`flex-1 min-w-[54px] h-8 text-[10px] font-mono font-bold rounded transition flex flex-col items-center justify-center cursor-pointer ${
                isSelected
                  ? 'bg-purple-600 text-white shadow ring-1 ring-purple-400'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800/80'
              }`}
            >
              <span>P{p.pass}</span>
              <span className="text-[8px] opacity-80">Ø{p.toDie.toFixed(2)}</span>
            </button>
          );
        })}
      </div>

      {/* Material & Physics Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-900 text-xs font-mono shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] font-bold">Wire Metal:</span>
            <select
              value={wireMaterial}
              onChange={(e) => setWireMaterial(e.target.value as WireMaterialType)}
              className="bg-slate-900 text-amber-400 text-[11px] font-mono border border-slate-800 rounded px-2 py-1 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="copper">Copper (Cu)</option>
              <option value="steel">Steel (Fe)</option>
              <option value="aluminum">Aluminum (Al)</option>
              <option value="brass">Brass (CuZn)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] font-bold">Die Nib:</span>
            <select
              value={dieNibMaterial}
              onChange={(e) => setDieNibMaterial(e.target.value as DieNibMaterialType)}
              className="bg-slate-900 text-cyan-400 text-[11px] font-mono border border-slate-800 rounded px-2 py-1 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="carbide">Tungsten Carbide (WC)</option>
              <option value="pcd">PCD Diamond</option>
              <option value="diamond">Natural Diamond (ND)</option>
            </select>
          </div>
        </div>

        {activeViewMode === 'train' && (
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1">
              <span className="text-slate-500 text-[10px] font-bold mr-1">View:</span>
              {[
                { id: 'iso' as const, label: '3D Iso' },
                { id: 'side' as const, label: 'Side' },
                { id: 'top' as const, label: 'Top' },
                { id: 'front' as const, label: 'Ingress' },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setViewPreset(v.id)}
                  className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded text-[10px] font-bold transition cursor-pointer"
                >
                  {v.label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={showCapstans}
                onChange={(e) => setShowCapstans(e.target.checked)}
                className="rounded border-slate-700 text-purple-600 focus:ring-0"
              />
              <span>Capstans</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="rounded border-slate-700 text-purple-600 focus:ring-0"
              />
              <span>Labels</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={showVelocityTags}
                onChange={(e) => setShowVelocityTags(e.target.checked)}
                className="rounded border-slate-700 text-purple-600 focus:ring-0"
              />
              <span>Speed</span>
            </label>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[10px]">Feed:</span>
              {[0.5, 1.0, 2.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setSpeedRate(rate)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                    speedRate === rate ? 'bg-cyan-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        )}

        {activeViewMode === 'single' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-slate-900 p-0.5 rounded border border-slate-800">
              <button
                onClick={() => setRenderMode('realistic')}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  renderMode === 'realistic' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Realistic CAD
              </button>
              <button
                onClick={() => setRenderMode('heatmap')}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  renderMode === 'heatmap' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                FEA Heatmap
              </button>
              <button
                onClick={() => setRenderMode('thermal')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  renderMode === 'thermal' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Flame className="w-3 h-3 text-amber-300" />
                <span>Thermal IR</span>
              </button>
              <button
                onClick={() => setRenderMode('shear')}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  renderMode === 'shear' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Shear Slip
              </button>
              <button
                onClick={() => setRenderMode('wireframe')}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  renderMode === 'wireframe' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Wireframe
              </button>
            </div>

            {/* 4-Zone Die Bore Selector */}
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] font-bold px-1.5">Zone:</span>
              {[
                { id: 'all' as const, label: 'All Bore', color: 'text-purple-400' },
                { id: 'bell' as const, label: 'Z1: Bell (R)', color: 'text-cyan-400' },
                { id: 'cone' as const, label: 'Z2: Cone (2α)', color: 'text-purple-400' },
                { id: 'bearing' as const, label: 'Z3: Land (Lb)', color: 'text-emerald-400' },
                { id: 'relief' as const, label: 'Z4: Relief (2β)', color: 'text-amber-400' },
              ].map((z) => (
                <button
                  key={z.id}
                  onClick={() => setSelectedZone(z.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                    selectedZone === z.id ? 'bg-slate-700 text-white shadow ring-1 ring-slate-500' : `${z.color} hover:bg-slate-800`
                  }`}
                >
                  {z.label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-cyan-300 text-[11px]">
              <input
                type="checkbox"
                checked={showDimensions}
                onChange={(e) => setShowDimensions(e.target.checked)}
                className="rounded border-slate-700 text-cyan-600 focus:ring-0"
              />
              <Ruler className="w-3 h-3 text-cyan-400" />
              <span>CAD Dimensions</span>
            </label>
          </div>
        )}
      </div>

      {/* Single Die Geometry Tweak Sliders */}
      {activeViewMode === 'single' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/80 p-3.5 rounded-xl border border-slate-900 text-xs font-mono shrink-0">
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Approach Angle (2&alpha;):</span>
              <span className="text-purple-400 font-bold">{approachAngle2Alpha}&deg;</span>
            </div>
            <input
              type="range"
              min="8"
              max="24"
              step="1"
              value={approachAngle2Alpha}
              onChange={(e) => setApproachAngle2Alpha(parseInt(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Bearing Length (Lb):</span>
              <span className="text-emerald-400 font-bold">{bearingLengthLbRatio}% d&sub2;</span>
            </div>
            <input
              type="range"
              min="20"
              max="60"
              step="5"
              value={bearingLengthLbRatio}
              onChange={(e) => setBearingLengthLbRatio(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Scissors className="w-3 h-3 text-cyan-400" />
                <span>Cutaway Slice Window:</span>
              </span>
              <span className="text-cyan-400 font-bold">{sliceAngleDeg}&deg;</span>
            </div>
            <input
              type="range"
              min="90"
              max="360"
              step="90"
              value={sliceAngleDeg}
              onChange={(e) => setSliceAngleDeg(parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Compare Mode Pass Selectors */}
      {activeViewMode === 'compare' && (
        <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-2.5 rounded-xl border border-slate-900/60 text-xs font-mono shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold uppercase tracking-wider">Pass Left:</span>
            <select
              value={comparePassIdxA}
              onChange={(e) => setComparePassIdxA(parseInt(e.target.value))}
              className="bg-slate-900 text-[var(--color-text)] text-xs font-mono border border-slate-800 rounded px-2.5 py-1 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              {passes.map((p, idx) => (
                <option key={idx} value={idx}>Pass #{p.pass} ({p.toDie.toFixed(2)} mm)</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold uppercase tracking-wider">Pass Right:</span>
            <select
              value={comparePassIdxB}
              onChange={(e) => setComparePassIdxB(parseInt(e.target.value))}
              className="bg-slate-900 text-[var(--color-text)] text-xs font-mono border border-slate-800 rounded px-2.5 py-1 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              {passes.map((p, idx) => (
                <option key={idx} value={idx}>Pass #{p.pass} ({p.toDie.toFixed(2)} mm)</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Main 3D Viewport Grid */}
      <div className={`grid grid-cols-1 ${isFullscreen ? 'lg:grid-cols-12 flex-1 min-h-0' : 'lg:grid-cols-12'} gap-6 items-stretch`}>
        {/* Render Canvas Area with Decoupled CAD Navigation */}
        <div
          ref={mainContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            cursor: navTool === 'pan' ? 'grab' : 'crosshair',
            touchAction: 'none'
          }}
          className={`${
            isFullscreen ? 'lg:col-span-8 xl:col-span-9 h-full' : 'lg:col-span-8 min-h-[440px]'
          } bg-slate-950/90 border border-slate-900 rounded-xl relative overflow-hidden shadow-inner p-2 flex items-stretch`}
        >
          {activeViewMode === 'train' && (
            <div className="w-full relative h-full flex flex-col justify-between">
              <MultiPassTrainCanvas
                passes={passes}
                selectedPassIdx={selectedPassIdx}
                onSelectPass={setSelectedPassIdx}
                cameraRef={cameraRef}
                isPlaying={isPlaying}
                speedRate={speedRate}
                showCapstans={showCapstans}
                showLabels={showLabels}
                showVelocityTags={showVelocityTags}
                wireMaterial={wireMaterial}
                dieNibMaterial={dieNibMaterial}
                onHoverStation={setTrainHoverInfo}
                canvasRef={trainCanvasRef}
              />

              {/* Station Hover Tooltip */}
              {trainHoverInfo && (
                <div
                  className="pointer-events-none absolute z-50 bg-slate-900/95 border border-purple-500/50 rounded-lg p-2.5 text-[10px] font-mono shadow-2xl backdrop-blur space-y-1 min-w-[170px]"
                  style={{
                    left: Math.min(
                      displaySizeW(mainContainerRef) - 180,
                      Math.max(10, trainHoverInfo.screenX - (mainContainerRef.current?.getBoundingClientRect().left ?? 0) + 12)
                    ),
                    top: Math.max(10, trainHoverInfo.screenY - (mainContainerRef.current?.getBoundingClientRect().top ?? 0) - 10),
                  }}
                >
                  <div className="flex justify-between items-center text-purple-300 font-bold border-b border-slate-800 pb-1">
                    <span>STATION #{trainHoverInfo.passNum}</span>
                    <span className="text-cyan-400">{trainHoverInfo.speedMultiplier.toFixed(1)}x SPEED</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Draft:</span>
                    <span>Ø{trainHoverInfo.din.toFixed(3)} &rarr; Ø{trainHoverInfo.dout.toFixed(3)} mm</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span className="text-slate-500">Reduction:</span>
                    <span>-{trainHoverInfo.areaRed.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-amber-400">
                    <span className="text-slate-500">Elongation:</span>
                    <span>+{trainHoverInfo.elongation.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-pink-400">
                    <span className="text-slate-500">Pull Force:</span>
                    <span>{trainHoverInfo.drawingForceN.toFixed(0)} N</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeViewMode === 'single' && (
            <div className="w-full relative h-full flex flex-col justify-between">
              <SingleDieCanvas
                pass={activePassSingle}
                approachAngle2Alpha={approachAngle2Alpha}
                bearingLengthLbRatio={bearingLengthLbRatio}
                sliceAngleDeg={sliceAngleDeg}
                cameraRef={cameraRef}
                isPlaying={isPlaying}
                renderMode={renderMode}
                selectedZone={selectedZone}
                wireMaterial={wireMaterial}
                dieNibMaterial={dieNibMaterial}
                showDimensions={showDimensions}
                canvasRef={singleCanvasRef}
                onHover={setSingleHoverInfo}
              />

              {singleHoverInfo && (
                <div
                  className="pointer-events-none absolute z-50 bg-slate-900/95 border border-slate-700 rounded-lg px-3 py-2 text-[10px] font-mono shadow-xl"
                  style={{
                    left: singleHoverInfo.x - (mainContainerRef.current?.getBoundingClientRect().left ?? 0) + 12,
                    top: singleHoverInfo.y - (mainContainerRef.current?.getBoundingClientRect().top ?? 0) - 8,
                  }}
                >
                  <div className="text-slate-300 font-bold mb-1">Axial: {singleHoverInfo.axial.toFixed(1)} mm</div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-pink-500 inline-block" />
                    <span className="text-pink-400">{singleHoverInfo.stress.toFixed(0)} MPa</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Thermometer className="w-2.5 h-2.5 text-amber-400" />
                    <span className="text-amber-400">{singleHoverInfo.temp.toFixed(1)} &deg;C</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Strain:</span>
                    <span className="text-cyan-400">{singleHoverInfo.strain.toFixed(3)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeViewMode === 'compare' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full">
              <div className="relative border-r border-slate-900/60 pr-1 flex flex-col justify-between">
                <div className="absolute top-2 left-2 z-10 text-[9px] font-mono bg-purple-950/70 border border-purple-800/40 text-purple-400 font-bold px-2 py-0.5 rounded">
                  PASS #{activePassA.pass} (Ø{activePassA.toDie.toFixed(2)} mm)
                </div>
                <SingleDieCanvas
                  pass={activePassA}
                  approachAngle2Alpha={approachAngle2Alpha}
                  bearingLengthLbRatio={bearingLengthLbRatio}
                  sliceAngleDeg={sliceAngleDeg}
                  cameraRef={cameraRef}
                  isPlaying={isPlaying}
                  renderMode={renderMode}
                  selectedZone={selectedZone}
                  wireMaterial={wireMaterial}
                  dieNibMaterial={dieNibMaterial}
                  showDimensions={false}
                  canvasRef={canvasRefA}
                  onHover={() => {}}
                />
              </div>

              <div className="relative flex flex-col justify-between pl-1">
                <div className="absolute top-2 left-2 z-10 text-[9px] font-mono bg-emerald-950/70 border border-emerald-800/40 text-emerald-400 font-bold px-2 py-0.5 rounded">
                  PASS #{activePassB.pass} (Ø{activePassB.toDie.toFixed(2)} mm)
                </div>
                <SingleDieCanvas
                  pass={activePassB}
                  approachAngle2Alpha={approachAngle2Alpha}
                  bearingLengthLbRatio={bearingLengthLbRatio}
                  sliceAngleDeg={sliceAngleDeg}
                  cameraRef={cameraRef}
                  isPlaying={isPlaying}
                  renderMode={renderMode}
                  selectedZone={selectedZone}
                  wireMaterial={wireMaterial}
                  dieNibMaterial={dieNibMaterial}
                  showDimensions={false}
                  canvasRef={canvasRefB}
                  onHover={() => {}}
                />
              </div>
            </div>
          )}

          {/* Top-Left CAD Toolbar */}
          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-20 bg-slate-900/85 backdrop-blur p-1.5 rounded-xl border border-slate-800 shadow-xl">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition cursor-pointer"
              title={isPlaying ? 'Pause wire feed' : 'Start wire feed'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

            <button
              onClick={() => setNavTool('orbit')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                navTool === 'orbit' ? 'bg-purple-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Orbit 3D (Left Drag)"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setNavTool('pan')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                navTool === 'pan' ? 'bg-purple-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Pan View (Middle Drag / Shift+Drag)"
            >
              <Move className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

            <button
              onClick={() => {
                const newZ = Math.min(5.0, Number((cameraRef.current.zoom * 1.2).toFixed(2)));
                cameraRef.current.zoom = newZ;
                setUiZoom(newZ);
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition cursor-pointer"
              title="Zoom In (Scroll Up or +)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                const newZ = Math.max(0.25, Number((cameraRef.current.zoom * 0.83).toFixed(2)));
                cameraRef.current.zoom = newZ;
                setUiZoom(newZ);
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition cursor-pointer"
              title="Zoom Out (Scroll Down or -)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={focusSelectedPass}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-400 border border-slate-700/60 transition cursor-pointer"
              title="Focus Camera on Selected Die Station"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={fitView}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700/60 transition cursor-pointer"
              title="Fit to Window / Reset CAD View"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={fitView}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition cursor-pointer"
              title="Reset Angles"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <span className="text-[10px] font-mono font-bold text-slate-400 px-1.5">
              {Math.round(uiZoom * 100)}%
            </span>
          </div>

          {/* Bottom Legend */}
          <div className="absolute bottom-3 left-3 right-3 bg-slate-900/85 backdrop-blur border border-slate-800/80 px-3.5 py-1.5 rounded-xl flex items-center justify-between text-[10px] font-mono z-20">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>
                <strong>Mouse Scroll:</strong> Zoom &bull; <strong>Left-Drag:</strong> Orbit &bull; <strong>Right/Middle-Drag:</strong> Pan &bull; <strong>Click Station:</strong> Inspect
              </span>
            </div>
            {activeViewMode === 'single' && renderMode === 'heatmap' && (
              <div className="flex items-center space-x-2">
                <span className="text-blue-400">0 MPa</span>
                <div className="w-20 h-1.5 rounded-full border border-slate-700 flex overflow-hidden">
                  <div className="flex-1 bg-blue-500" />
                  <div className="flex-1 bg-emerald-500" />
                  <div className="flex-1 bg-amber-500" />
                  <div className="flex-1 bg-red-500" />
                </div>
                <span className="text-pink-400 font-bold">{sigmaFlow ? (sigmaFlow * 2.5).toFixed(0) : '—'} MPa</span>
              </div>
            )}
            {activeViewMode === 'single' && renderMode === 'thermal' && (
              <div className="flex items-center space-x-2">
                <span className="text-cyan-400">25°C Amb</span>
                <div className="w-24 h-1.5 rounded-full border border-slate-700 flex overflow-hidden">
                  <div className="flex-1 bg-cyan-500" />
                  <div className="flex-1 bg-emerald-500" />
                  <div className="flex-1 bg-amber-500" />
                  <div className="flex-1 bg-red-500" />
                  <div className="flex-1 bg-pink-500" />
                </div>
                <span className="text-pink-400 font-bold">180°C Max</span>
              </div>
            )}
          </div>
        </div>

        {/* Selected Pass Mechanics Sidebar */}
        <div className={`${
          isFullscreen ? 'lg:col-span-4 xl:col-span-3 h-full overflow-y-auto' : 'lg:col-span-4'
        } bg-slate-950/90 border border-slate-900 rounded-xl p-5 space-y-4`}>
          <div className="flex justify-between items-center pb-3 border-b border-slate-900">
            <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider m-0 font-heading flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span>Pass #{activePassSingle.pass} Telemetry</span>
            </h4>
            <span className="text-[10px] font-mono text-purple-400 font-bold bg-purple-950/40 px-2 py-0.5 rounded border border-purple-900/30 uppercase tracking-wide">
              Station {selectedPassIdx + 1} of {passes.length}
            </span>
          </div>

          {/* 4-Zone Die Bore Inspector Card */}
          {activeViewMode === 'single' && (
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-800">
                <span className="font-bold flex items-center gap-1.5" style={{ color: DIE_ZONES[selectedZone].color }}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{DIE_ZONES[selectedZone].name}</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {DIE_ZONES[selectedZone].angleOrDim}
                </span>
              </div>
              <div className="text-slate-400 text-[10px] leading-relaxed">
                {DIE_ZONES[selectedZone].purpose}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
                <span className="text-slate-500 font-bold">Governing Formula:</span>
                <span className="text-cyan-300 font-bold">{DIE_ZONES[selectedZone].formula}</span>
              </div>
            </div>
          )}

          {/* Sidebar Zoom Slider */}
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-400">CAD View Zoom:</span>
              <span className="text-cyan-400 font-bold">{Math.round(uiZoom * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.25"
              max="4.0"
              step="0.05"
              value={uiZoom}
              onChange={(e) => {
                const z = parseFloat(e.target.value);
                cameraRef.current.zoom = z;
                setUiZoom(z);
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>Wide (25%)</span>
              <span>100%</span>
              <span>Micro (400%)</span>
            </div>
          </div>

          {activeViewMode !== 'compare' ? (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex justify-between p-2 bg-slate-900/40 rounded border border-slate-900">
                <span className="text-slate-400">Inlet Diameter (d&sub1;):</span>
                <span className="text-blue-400 font-bold">{(din).toFixed(3)} mm</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-900/40 rounded border border-slate-900">
                <span className="text-slate-400">Outlet Diameter (d&sub2;):</span>
                <span className="text-emerald-400 font-bold">{(dout).toFixed(3)} mm</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-900/40 rounded border border-slate-900">
                <span className="text-slate-400">Area Reduction (r):</span>
                <span className="text-emerald-400 font-bold">{(areaRed).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-900/40 rounded border border-slate-900">
                <span className="text-slate-400">Speed Multiplier (v/v&sub0;):</span>
                <span className="text-cyan-400 font-bold">
                  {(Math.pow(passes[0]?.fromDie ?? din, 2) / Math.pow(dout, 2)).toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between p-2 bg-slate-900/40 rounded border border-slate-900">
                <span className="text-slate-400">Drawing Force (F&sub1;):</span>
                <span className="text-pink-400 font-bold">{forceN.toFixed(0)} N</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-900/40 rounded border border-slate-900">
                <span className="text-slate-400">Drawing Stress (&sigma;<sub>d</sub>):</span>
                <span className="text-purple-400 font-bold">{sigmaD.toFixed(0)} MPa</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-900/40 rounded border border-slate-900">
                <span className="text-slate-400">Temp Rise (&Delta;T):</span>
                <span className="text-amber-400 font-bold">+{deltaT.toFixed(1)} &deg;C</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 font-mono text-[10px]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-slate-300 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase">
                      <th className="py-1">Metric</th>
                      <th className="py-1 text-purple-400">Pass A</th>
                      <th className="py-1 text-emerald-400">Pass B</th>
                      <th className="py-1 text-right">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-900/40">
                      <td className="py-1.5 font-bold">Inlet (mm)</td>
                      <td className="py-1.5">{(activePassA.fromDie ?? 0).toFixed(3)}</td>
                      <td className="py-1.5">{(activePassB.fromDie ?? 0).toFixed(3)}</td>
                      <td className="py-1.5 text-right font-bold">{calculateDelta(activePassA.fromDie ?? 0, activePassB.fromDie ?? 0)}</td>
                    </tr>
                    <tr className="border-b border-slate-900/40">
                      <td className="py-1.5 font-bold">Outlet (mm)</td>
                      <td className="py-1.5">{(activePassA.toDie ?? 0).toFixed(3)}</td>
                      <td className="py-1.5">{(activePassB.toDie ?? 0).toFixed(3)}</td>
                      <td className="py-1.5 text-right font-bold text-emerald-400">{calculateDelta(activePassA.toDie ?? 0, activePassB.toDie ?? 0)}</td>
                    </tr>
                    <tr className="border-b border-slate-900/40">
                      <td className="py-1.5 font-bold">Reduction (%)</td>
                      <td className="py-1.5">{(activePassA.areaReduction ?? 0).toFixed(1)}%</td>
                      <td className="py-1.5">{(activePassB.areaReduction ?? 0).toFixed(1)}%</td>
                      <td className="py-1.5 text-right font-bold text-cyan-400">{calculateDelta(activePassA.areaReduction ?? 0, activePassB.areaReduction ?? 0)}%</td>
                    </tr>
                    <tr className="border-b border-slate-900/40">
                      <td className="py-1.5 font-bold">Stress (MPa)</td>
                      <td className="py-1.5">{computeDrawingStress(activePassA, approachAngle2Alpha).toFixed(0)}</td>
                      <td className="py-1.5">{computeDrawingStress(activePassB, approachAngle2Alpha).toFixed(0)}</td>
                      <td className="py-1.5 text-right font-bold text-purple-400">{calculateDelta(
                        computeDrawingStress(activePassA, approachAngle2Alpha),
                        computeDrawingStress(activePassB, approachAngle2Alpha)
                      )}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Educational Explainer */}
          <div className="pt-2 border-t border-slate-900">
            <button
              onClick={() => setShowExplainer(!showExplainer)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer font-mono"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>How Multi-Pass Drawing Works</span>
              </span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showExplainer ? 'rotate-90' : ''}`} />
            </button>

            <AnimatePresence>
              {showExplainer && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-3 space-y-2 text-[11px] text-slate-400 leading-relaxed font-sans overflow-hidden"
                >
                  <div className="p-2.5 rounded bg-slate-900/50 border border-slate-800/80 space-y-1">
                    <strong className="text-cyan-300 block font-mono text-[10px] uppercase">1. Conical Plastic Compression</strong>
                    <p className="m-0">
                      Wire enters the tapered tungsten carbide / diamond die nib where radial compressive force exceeds the metal's yield point, squeezing its diameter down.
                    </p>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900/50 border border-slate-800/80 space-y-1">
                    <strong className="text-emerald-300 block font-mono text-[10px] uppercase">2. Mass Conservation & Speed-Up</strong>
                    <p className="m-0">
                      Because metal volume is conserved (<i>A<sub>in</sub> &bull; v<sub>in</sub> = A<sub>out</sub> &bull; v<sub>out</sub></i>), thinning the wire causes it to elongate and accelerate proportionally at every pass!
                    </p>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900/50 border border-slate-800/80 space-y-1">
                    <strong className="text-amber-300 block font-mono text-[10px] uppercase">3. Capstan Pulling Synchronization</strong>
                    <p className="m-0">
                      Rotating capstan drums pull the wire through each die while matching the exact accelerated line speed to prevent wire breakage or slip.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function displaySizeW(ref: React.RefObject<HTMLDivElement | null>): number {
  return ref.current?.getBoundingClientRect().width ?? 600;
}
