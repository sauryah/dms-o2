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
  Sparkles,
  Shield,
  Ruler,
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

// Material presets for realistic rendering
type WireMaterialType = 'copper' | 'steel' | 'aluminum' | 'brass';
type DieNibMaterialType = 'carbide' | 'pcd' | 'diamond';

interface MaterialTheme {
  name: string;
  wireGradient: [string, string, string]; // start, specular highlight, base
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
    brazeColor: '#ca8a04', // Golden brass brazing joint
    luster: '#94a3b8',
  },
  pcd: {
    name: 'Polycrystalline Diamond (PCD)',
    coreColor: '#0f172a',
    rimColor: '#1e293b',
    brazeColor: '#0284c7', // High-temp cobalt braze
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

// Physical and material constants for wire drawing stress calculations
const STRENGTH_COEFFICIENT_K = 315;      // K parameter (MPa)
const HARDENING_EXPONENT_N = 0.54;       // n exponent
const FRICTION_COEFFICIENT_MU = 0.04;     // mu coefficient

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
  const sigmaD = computeDrawingStress(pass, approachAngle2Alpha); // MPa (N/mm^2)
  const exitArea = Math.PI * Math.pow((pass.toDie ?? 1.0) / 2, 2); // mm^2
  return sigmaD * exitArea; // Newtons
};

// =========================================================================
// 1. MULTI-PASS CONTINUOUS WIRE DRAWING TRAIN 3D CANVAS
// =========================================================================
const MultiPassTrainCanvas = React.memo(function MultiPassTrainCanvas({
  passes,
  selectedPassIdx,
  onSelectPass,
  rotationX,
  rotationY,
  zoom,
  panX,
  panY,
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
  rotationX: number;
  rotationY: number;
  zoom: number;
  panX: number;
  panY: number;
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
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number }>({ w: 800, h: 420 });
  const isActuallyPlayingRef = useRef(true);

  // ResizeObserver for responsive canvas
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDisplaySize({
          w: Math.max(320, Math.floor(width)),
          h: Math.max(300, Math.floor(height)),
        });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Update canvas pixel ratio
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = displaySize.w * dpr;
    canvas.height = displaySize.h * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
  }, [displaySize, canvasRef]);

  useEffect(() => {
    isActuallyPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Geometry computation for multi-die line
  const N = passes.length;
  const initialDia = passes[0]?.fromDie ?? 2.5;
  const initialArea = Math.PI * Math.pow(initialDia / 2, 2);

  // Spacing between die stands
  const stationSpacing = Math.max(95, Math.min(140, 1050 / Math.max(N, 1)));
  const totalLength = (N - 1) * stationSpacing;
  const startX = -totalLength / 2;

  // Compute station positions and wire radii
  const stations = passes.map((p, idx) => {
    const x = startX + idx * stationSpacing;
    const din = p.fromDie;
    const dout = p.toDie;
    const areaOut = Math.PI * Math.pow(dout / 2, 2);
    const speedMult = Math.max(1.0, initialArea / Math.max(0.0001, areaOut));
    const forceN = computeDrawingForce(p);
    const sigmaD = computeDrawingStress(p);

    // Graphical radius scaling (normalized for visual clarity)
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

  // Mouse hover & station detection
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const radX = (rotationX * Math.PI) / 180;
    const radY = (rotationY * Math.PI) / 180;
    const centerCanvasX = displaySize.w / 2;
    const centerCanvasY = displaySize.h / 2;

    let closestStation: TrainHoverInfo | null = null;
    let minDistance = 50; // pixel threshold

    stations.forEach((st) => {
      const x1 = (st.x + panX) * Math.cos(radY);
      const z1 = -(st.x + panX) * Math.sin(radY);
      const y2 = panY * Math.cos(radX) - z1 * Math.sin(radX);
      const px = centerCanvasX + x1 * zoom;
      const py = centerCanvasY + y2 * zoom;

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
  }, [canvasRef, displaySize, stations, rotationX, rotationY, zoom, panX, panY, onHoverStation]);

  const handleMouseLeave = useCallback(() => {
    onHoverStation(null);
  }, [onHoverStation]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const radX = (rotationX * Math.PI) / 180;
    const radY = (rotationY * Math.PI) / 180;
    const centerCanvasX = displaySize.w / 2;
    const centerCanvasY = displaySize.h / 2;

    let targetIdx: number | null = null;
    let minDistance = 45;

    stations.forEach((st) => {
      const x1 = (st.x + panX) * Math.cos(radY);
      const z1 = -(st.x + panX) * Math.sin(radY);
      const y2 = panY * Math.cos(radX) - z1 * Math.sin(radX);
      const px = centerCanvasX + x1 * zoom;
      const py = centerCanvasY + y2 * zoom;

      const dist = Math.hypot(mouseX - px, mouseY - py);
      if (dist < minDistance) {
        minDistance = dist;
        targetIdx = st.idx;
      }
    });

    if (targetIdx !== null) {
      onSelectPass(targetIdx);
    }
  }, [canvasRef, displaySize, stations, rotationX, rotationY, zoom, panX, panY, onSelectPass]);

  // Main 3D Animation & Rendering Loop
  useEffect(() => {
    let animId: number;
    let flowTime = 0;

    const numParticles = Math.min(90, Math.max(36, N * 6));
    const particles = Array.from({ length: numParticles }, (_, i) => ({
      normPos: i / numParticles,
      laneAngle: (i * 1.37) % (Math.PI * 2),
    }));

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = displaySize.w;
      const height = displaySize.h;
      ctx.clearRect(0, 0, width, height);

      // Deep Industrial Studio Background
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, width * 0.85);
      bgGrad.addColorStop(0, '#0c1322');
      bgGrad.addColorStop(0.6, '#060a12');
      bgGrad.addColorStop(1, '#020408');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Floor Machine Bed Grid with Perspective Dimming
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.2)';
      ctx.lineWidth = 1;
      const gridSpacing = 40;
      for (let x = 0; x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(width / 2, height / 2);

      const radX = (rotationX * Math.PI) / 180;
      const radY = (rotationY * Math.PI) / 180;

      const project = (x: number, y: number, z: number) => {
        const xOffset = x + panX;
        const yOffset = y + panY;
        const x1 = xOffset * Math.cos(radY) + z * Math.sin(radY);
        const z1 = -xOffset * Math.sin(radY) + z * Math.cos(radY);
        const y2 = yOffset * Math.cos(radX) - z1 * Math.sin(radX);
        const z2 = yOffset * Math.sin(radX) + z1 * Math.cos(radX);
        return {
          px: x1 * zoom,
          py: y2 * zoom,
          depth: z2,
        };
      };

      const mat = WIRE_MATERIALS[wireMaterial];
      const dieMat = DIE_MATERIALS[dieNibMaterial];

      // 1. Draw Machine Rail / Cast Foundation Bed
      const lineLeft = startX - 80;
      const lineRight = startX + (N - 1) * stationSpacing + 80;
      const railY = 36;
      const railDepth = 30;

      // Bed Side Wall
      const b1 = project(lineLeft, railY, -railDepth);
      const b2 = project(lineRight, railY, -railDepth);
      const b3 = project(lineRight, railY + 12, -railDepth);
      const b4 = project(lineLeft, railY + 12, -railDepth);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(b1.px, b1.py);
      ctx.lineTo(b2.px, b2.py);
      ctx.lineTo(b3.px, b3.py);
      ctx.lineTo(b4.px, b4.py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Bed Top Surface (Machined Steel Plate)
      const t1 = project(lineLeft, railY, -railDepth);
      const t2 = project(lineRight, railY, -railDepth);
      const t3 = project(lineRight, railY, railDepth);
      const t4 = project(lineLeft, railY, railDepth);

      const bedGrad = ctx.createLinearGradient(t1.px, t1.py, t4.px, t4.py);
      bedGrad.addColorStop(0, '#1e293b');
      bedGrad.addColorStop(0.5, '#334155');
      bedGrad.addColorStop(1, '#0f172a');

      ctx.fillStyle = bedGrad;
      ctx.beginPath();
      ctx.moveTo(t1.px, t1.py);
      ctx.lineTo(t2.px, t2.py);
      ctx.lineTo(t3.px, t3.py);
      ctx.lineTo(t4.px, t4.py);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.6)';
      ctx.stroke();

      // Machined T-Slot Track centerline along the bench
      const c1 = project(lineLeft, railY - 0.5, -4);
      const c2 = project(lineRight, railY - 0.5, -4);
      const c3 = project(lineRight, railY - 0.5, 4);
      const c4 = project(lineLeft, railY - 0.5, 4);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.moveTo(c1.px, c1.py);
      ctx.lineTo(c2.px, c2.py);
      ctx.lineTo(c3.px, c3.py);
      ctx.lineTo(c4.px, c4.py);
      ctx.closePath();
      ctx.fill();

      // 2. Draw Realistic Metallic Drawn Wire
      const drawRealisticWireSegment = (
        xStart: number,
        xEnd: number,
        rStart: number,
        rEnd: number,
        isDeforming: boolean
      ) => {
        const segments = 18;
        for (let i = 0; i < segments; i++) {
          const a1 = (i / segments) * Math.PI * 2;
          const a2 = ((i + 1) / segments) * Math.PI * 2;

          const y1s = rStart * Math.cos(a1);
          const z1s = rStart * Math.sin(a1);
          const y2s = rStart * Math.cos(a2);
          const z2s = rStart * Math.sin(a2);

          const y1e = rEnd * Math.cos(a1);
          const z1e = rEnd * Math.sin(a1);
          const y2e = rEnd * Math.cos(a2);
          const z2e = rEnd * Math.sin(a2);

          const p1 = project(xStart, y1s, z1s);
          const p2 = project(xStart, y2s, z2s);
          const p3 = project(xEnd, y2e, z2e);
          const p4 = project(xEnd, y1e, z1e);

          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.lineTo(p3.px, p3.py);
          ctx.lineTo(p4.px, p4.py);
          ctx.closePath();

          // Metallic Cylindrical Lighting Normals
          const normalY = Math.cos((a1 + a2) / 2);
          const normalZ = Math.sin((a1 + a2) / 2);
          const specular = Math.pow(Math.max(0, -normalY * 0.7 - normalZ * 0.7), 4);
          const diffuse = Math.max(0.2, 0.45 + 0.55 * (-normalY));

          const grad = ctx.createLinearGradient(p1.px, p1.py, p3.px, p3.py);
          if (isDeforming) {
            grad.addColorStop(0, mat.wireContact);
            grad.addColorStop(1, mat.wireGradient[2]);
          } else {
            grad.addColorStop(0, mat.wireGradient[0]);
            grad.addColorStop(0.5, mat.wireGradient[1]);
            grad.addColorStop(1, mat.wireGradient[2]);
          }

          ctx.fillStyle = grad;
          ctx.globalAlpha = Math.min(1.0, diffuse + specular * 0.6);
          ctx.fill();

          // Highlight ridge on top of wire
          if (specular > 0.4) {
            ctx.strokeStyle = mat.sparkColor;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
          ctx.globalAlpha = 1.0;
        }
      };

      // Entrance raw rod
      const firstSt = stations[0];
      if (firstSt) {
        drawRealisticWireSegment(
          lineLeft,
          firstSt.x - 14,
          firstSt.rIn,
          firstSt.rIn,
          false
        );
      }

      // Span between sequential dies
      for (let i = 0; i < N; i++) {
        const curr = stations[i];
        const next = stations[i + 1];

        // Conical Reduction Zone inside die nib
        const coneStart = curr.x - 14;
        const coneEnd = curr.x + 10;
        drawRealisticWireSegment(
          coneStart,
          coneEnd,
          curr.rIn,
          curr.rOut,
          true
        );

        // Continuous wire running to next die station
        if (next) {
          drawRealisticWireSegment(
            coneEnd,
            next.x - 14,
            curr.rOut,
            curr.rOut,
            false
          );
        }
      }

      // Exit fine drawn wire
      const lastSt = stations[N - 1];
      if (lastSt) {
        drawRealisticWireSegment(
          lastSt.x + 10,
          lineRight,
          lastSt.rOut,
          lastSt.rOut,
          false
        );
      }

      // 3. Draw Capstan Pulling Drums between stands (if enabled)
      if (showCapstans) {
        for (let i = 0; i < N - 1; i++) {
          const stA = stations[i];
          const stB = stations[i + 1];
          const capstanX = (stA.x + stB.x) / 2;
          const capstanY = 18;
          const capstanR = 15;
          const capstanZ = 18;

          const drumCenter = project(capstanX, capstanY, capstanZ);
          const drumRotSpeed = flowTime * (stA.speedMultiplier * 0.08);

          // Drum body with metallic gradient
          ctx.beginPath();
          ctx.arc(drumCenter.px, drumCenter.py, capstanR * zoom, 0, Math.PI * 2);
          const drumGrad = ctx.createRadialGradient(
            drumCenter.px - 3 * zoom,
            drumCenter.py - 3 * zoom,
            2 * zoom,
            drumCenter.px,
            drumCenter.py,
            capstanR * zoom
          );
          drumGrad.addColorStop(0, '#64748b');
          drumGrad.addColorStop(0.7, '#1e293b');
          drumGrad.addColorStop(1, '#0f172a');
          ctx.fillStyle = drumGrad;
          ctx.fill();
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
          ctx.lineWidth = 1.4;
          ctx.stroke();

          // Spoke lines for spinning visual
          for (let s = 0; s < 4; s++) {
            const angle = drumRotSpeed + (s * Math.PI) / 2;
            const spokeX = drumCenter.px + Math.cos(angle) * (capstanR * 0.85 * zoom);
            const spokeY = drumCenter.py + Math.sin(angle) * (capstanR * 0.85 * zoom);
            ctx.beginPath();
            ctx.moveTo(drumCenter.px, drumCenter.py);
            ctx.lineTo(spokeX, spokeY);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }

          // Center spindle bolt
          ctx.beginPath();
          ctx.arc(drumCenter.px, drumCenter.py, 3.5 * zoom, 0, Math.PI * 2);
          ctx.fillStyle = '#38bdf8';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // 4. Draw Precision Industrial Die Assembly & Mounting Stand
      stations.forEach((st) => {
        const isSelected = st.idx === selectedPassIdx;
        const casingOuterR = Math.max(26, st.rIn + 16);
        const nibOuterR = casingOuterR * 0.58;
        const housingThickness = 20;
        const xStandStart = st.x - housingThickness / 2;
        const xStandEnd = st.x + housingThickness / 2;

        // A. Heavy Machined Die Holder Block / Casting Box
        const blockW = housingThickness + 10;
        const blockH = casingOuterR + 18;
        const pBlockL = project(st.x - blockW / 2, railY, -18);
        const pBlockR = project(st.x + blockW / 2, railY, -18);
        const pBlockTopL = project(st.x - blockW / 2, railY - blockH * 0.4, -18);
        const pBlockTopR = project(st.x + blockW / 2, railY - blockH * 0.4, -18);

        ctx.fillStyle = isSelected ? 'rgba(88, 28, 135, 0.85)' : 'rgba(30, 41, 59, 0.9)';
        ctx.strokeStyle = isSelected ? '#c084fc' : 'rgba(100, 116, 139, 0.7)';
        ctx.lineWidth = isSelected ? 1.8 : 1.0;
        ctx.beginPath();
        ctx.moveTo(pBlockL.px, pBlockL.py);
        ctx.lineTo(pBlockR.px, pBlockR.py);
        ctx.lineTo(pBlockTopR.px, pBlockTopR.py);
        ctx.lineTo(pBlockTopL.px, pBlockTopL.py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Socket Head Cap Fasteners (Bolts on stand)
        const bolt1 = project(st.x - 8, railY - 3, -16);
        const bolt2 = project(st.x + 8, railY - 3, -16);
        [bolt1, bolt2].forEach((b) => {
          ctx.beginPath();
          ctx.arc(b.px, b.py, 2 * zoom, 0, Math.PI * 2);
          ctx.fillStyle = '#94a3b8';
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        });

        // B. Precision 3D Cylindrical Die Casing (Stainless/Tool Steel Case)
        const segs = 24;
        for (let s = 0; s < segs; s++) {
          const a1 = (s / segs) * Math.PI * 2;
          const a2 = ((s + 1) / segs) * Math.PI * 2;

          const y1 = casingOuterR * Math.cos(a1);
          const z1 = casingOuterR * Math.sin(a1);
          const y2 = casingOuterR * Math.cos(a2);
          const z2 = casingOuterR * Math.sin(a2);

          const p1 = project(xStandStart, y1, z1);
          const p2 = project(xStandStart, y2, z2);
          const p3 = project(xStandEnd, y2, z2);
          const p4 = project(xStandEnd, y1, z1);

          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.lineTo(p3.px, p3.py);
          ctx.lineTo(p4.px, p4.py);
          ctx.closePath();

          // Brushed Stainless Steel Specular Reflection
          const normalY = Math.cos((a1 + a2) / 2);
          const normalZ = Math.sin((a1 + a2) / 2);
          const lightIntensity = Math.max(0.25, 0.5 + 0.5 * (-normalY) + 0.2 * (-normalZ));

          if (isSelected) {
            ctx.fillStyle = `rgba(168, 85, 247, ${lightIntensity * 0.9})`;
            ctx.strokeStyle = '#d8b4fe';
          } else {
            const steelVal = Math.floor(100 + lightIntensity * 120);
            ctx.fillStyle = `rgb(${steelVal * 0.4}, ${steelVal * 0.45}, ${steelVal * 0.55})`;
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
          }
          ctx.lineWidth = 0.75;
          ctx.fill();
          ctx.stroke();
        }

        // C. Front Face of Die with Sintered Nib, Brazing Ring & Entrance Bell
        const pCenterFront = project(xStandStart, 0, 0);

        // Outer Casing Chamfer Bevel Ring
        ctx.beginPath();
        ctx.arc(pCenterFront.px, pCenterFront.py, (casingOuterR - 2) * zoom, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? '#581c87' : '#334155';
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#e9d5ff' : '#94a3b8';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Brass/Cobalt Brazing Seat Ring
        ctx.beginPath();
        ctx.arc(pCenterFront.px, pCenterFront.py, (nibOuterR + 2) * zoom, 0, Math.PI * 2);
        ctx.fillStyle = dieMat.brazeColor;
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Dark Tungsten Carbide / PCD Nib Core
        ctx.beginPath();
        ctx.arc(pCenterFront.px, pCenterFront.py, nibOuterR * zoom, 0, Math.PI * 2);
        ctx.fillStyle = dieMat.coreColor;
        ctx.fill();
        ctx.strokeStyle = dieMat.luster;
        ctx.lineWidth = 1.0;
        ctx.stroke();

        // Entrance Bell Funnel (Conical Ingress Hole)
        ctx.beginPath();
        ctx.arc(pCenterFront.px, pCenterFront.py, st.rIn * zoom, 0, Math.PI * 2);
        const bellGrad = ctx.createRadialGradient(
          pCenterFront.px,
          pCenterFront.py,
          st.rOut * zoom,
          pCenterFront.px,
          pCenterFront.py,
          st.rIn * zoom
        );
        bellGrad.addColorStop(0, '#000000');
        bellGrad.addColorStop(0.7, dieMat.rimColor);
        bellGrad.addColorStop(1, dieMat.coreColor);
        ctx.fillStyle = bellGrad;
        ctx.fill();
        ctx.strokeStyle = dieMat.luster;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Selected station glowing CAD HUD Halo
        if (isSelected) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(pCenterFront.px, pCenterFront.py, (casingOuterR + 10) * zoom, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.9)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.restore();
        }

        // 5. Pass Number Tag & Die Specifications Callout
        if (showLabels) {
          const topPos = project(st.x, -casingOuterR - 12, 0);
          ctx.save();
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';

          // Badge background
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

          // Calibrated Output Diameter Callout
          ctx.font = 'bold 8.5px monospace';
          ctx.fillStyle = isSelected ? '#c084fc' : '#38bdf8';
          ctx.fillText(`Ø${st.dout.toFixed(3)} mm`, topPos.px, topPos.py + 10);
          ctx.restore();
        }

        // Velocity Acceleration Tag below Machine Bed
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

      // 6. Animate Speed-Proportional Drawing Particles & Flow Streaks
      if (isPlaying) {
        flowTime += 0.8 * speedRate;
      }

      particles.forEach((pt) => {
        if (isPlaying) {
          pt.normPos = (pt.normPos + 0.0035 * speedRate) % 1.0;
        }

        const currentLineX = lineLeft + pt.normPos * (lineRight - lineLeft);

        let localRadius = firstSt?.rIn ?? 14;
        let localSpeedMult = 1.0;

        for (let s = 0; s < N; s++) {
          const st = stations[s];
          if (currentLineX >= st.x) {
            localRadius = st.rOut;
            localSpeedMult = st.speedMultiplier;
          }
        }

        const partY = Math.cos(pt.laneAngle) * (localRadius * 0.7);
        const partZ = Math.sin(pt.laneAngle) * (localRadius * 0.7);
        const pPos = project(currentLineX, partY, partZ);

        const streakLen = Math.min(28, 5 * Math.sqrt(localSpeedMult)) * zoom;
        const tailPos = project(currentLineX - streakLen, partY, partZ);

        ctx.beginPath();
        ctx.moveTo(tailPos.px, tailPos.py);
        ctx.lineTo(pPos.px, pPos.py);
        ctx.strokeStyle = `rgba(244, 114, 182, ${Math.min(1.0, 0.4 + localSpeedMult * 0.06)})`;
        ctx.lineWidth = Math.max(1.2, 2.2 * (localRadius / 14));
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pPos.px, pPos.py, Math.max(1.4, 2.4 * (localRadius / 14)), 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });

      ctx.restore();

      if (isActuallyPlayingRef.current) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [
    passes, stations, selectedPassIdx, rotationX, rotationY, zoom, panX, panY,
    isPlaying, speedRate, showCapstans, showLabels, showVelocityTags,
    wireMaterial, dieNibMaterial, displaySize, N, startX, stationSpacing,
    initialDia, initialArea, canvasRef
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
// 2. SINGLE DIE DEEP DEFORMATION ZONE CANVAS (PHOTOREALISTIC CUTAWAY)
// =========================================================================
const SingleDieCanvas = React.memo(function SingleDieCanvas({
  pass,
  approachAngle2Alpha,
  bearingLengthLbRatio,
  sliceAngleDeg,
  rotationX,
  rotationY,
  zoom,
  panX,
  panY,
  isPlaying,
  renderMode,
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
  rotationX: number;
  rotationY: number;
  zoom: number;
  panX: number;
  panY: number;
  isPlaying: boolean;
  renderMode: 'realistic' | 'heatmap' | 'wireframe' | 'shear';
  wireMaterial: WireMaterialType;
  dieNibMaterial: DieNibMaterialType;
  showDimensions: boolean;
  onHover?: (info: HoverInfo | null) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number }>({ w: 400, h: 300 });
  const isActuallyPlayingRef = useRef(true);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDisplaySize({
          w: Math.max(200, Math.floor(width)),
          h: Math.max(200, Math.floor(height)),
        });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = displaySize.w * dpr;
    canvas.height = displaySize.h * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
  }, [displaySize, canvasRef]);

  useEffect(() => {
    isActuallyPlayingRef.current = isPlaying;
  }, [isPlaying]);

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

  // Real industrial standard scaling factor
  const scaleR = 20;
  const rIn = (din / 2) * scaleR;
  const rOut = (dout / 2) * scaleR;

  // True 4-Zone Internal Die Geometry Profile
  const rBell = 18; // Bell entrance radius
  const coneLength = Math.max(35, Math.min(130, (rIn - rOut) / Math.tan(Math.max(alphaRadHalf, 0.01))));
  const bearingLen = (bearingLengthLbRatio / 100) * dout * scaleR;
  const backReliefAngleRad = (30 * Math.PI) / 180; // 60 deg included back relief
  const reliefLen = Math.max(25, (rIn - rOut) * 0.8);

  const xEntrance = -190;
  const xBellStart = -coneLength / 2 - rBell;
  const xConeStart = -coneLength / 2;
  const xConeEnd = coneLength / 2;
  const xBearEnd = xConeEnd + bearingLen;
  const xReliefEnd = xBearEnd + reliefLen;
  const xExit = Math.max(xReliefEnd + 100, xConeEnd + 210);

  // Outer Casing & Sintered Nib Dimensions (DIN 2812 Standard Proportions)
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

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = displaySize.w;
      const height = displaySize.h;
      ctx.clearRect(0, 0, width, height);

      // Deep CAD Dark Room Background
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, width * 0.85);
      bgGrad.addColorStop(0, '#0c1322');
      bgGrad.addColorStop(0.7, '#060a12');
      bgGrad.addColorStop(1, '#020408');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Shopfloor Precision Grid
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(width / 2, height / 2);

      const radX = (rotationX * Math.PI) / 180;
      const radY = (rotationY * Math.PI) / 180;

      const project3D = (x: number, y: number, z: number) => {
        const xOffset = x + panX;
        const yOffset = y + panY;
        const x1 = xOffset * Math.cos(radY) + z * Math.sin(radY);
        const z1 = -xOffset * Math.sin(radY) + z * Math.cos(radY);
        const y2 = yOffset * Math.cos(radX) - z1 * Math.sin(radX);
        return { px: x1 * zoom, py: y2 * zoom };
      };

      const mat = WIRE_MATERIALS[wireMaterial];
      const dieMat = DIE_MATERIALS[dieNibMaterial];

      const numSegments = 36;
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

      // Helper to render 3D Cylinder Shell / Cutaway Sections
      const draw3DCylinderSection = (
        xStart: number,
        xEnd: number,
        rStart: number,
        rEnd: number,
        layerType: 'casing' | 'braze' | 'nib' | 'wire'
      ) => {
        for (let i = 0; i < numSegments; i++) {
          const angle1 = (i / numSegments) * Math.PI * 2;
          const angle2 = ((i + 1) / numSegments) * Math.PI * 2;

          // Skip section if inside cutaway window (so interior profile & wire are visible)
          if (layerType !== 'wire' && angle1 > maxCutoffRad) continue;

          const y1s = rStart * Math.cos(angle1);
          const z1s = rStart * Math.sin(angle1);
          const y2s = rStart * Math.cos(angle2);
          const z2s = rStart * Math.sin(angle2);

          const y1e = rEnd * Math.cos(angle1);
          const z1e = rEnd * Math.sin(angle1);
          const y2e = rEnd * Math.cos(angle2);
          const z2e = rEnd * Math.sin(angle2);

          const p1 = project3D(xStart, y1s, z1s);
          const p2 = project3D(xStart, y2s, z2s);
          const p3 = project3D(xEnd, y2e, z2e);
          const p4 = project3D(xEnd, y1e, z1e);

          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.lineTo(p3.px, p3.py);
          ctx.lineTo(p4.px, p4.py);
          ctx.closePath();

          const normalY = Math.cos((angle1 + angle2) / 2);
          const normalZ = Math.sin((angle1 + angle2) / 2);
          const specular = Math.pow(Math.max(0, -normalY * 0.7 - normalZ * 0.7), 4);
          const lightFactor = Math.max(0.2, 0.5 + 0.5 * (-normalY) + 0.2 * (-normalZ));

          if (layerType === 'casing') {
            // Stainless Steel Die Case
            if (renderMode === 'wireframe') {
              ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
              ctx.strokeStyle = 'rgba(94, 234, 212, 0.4)';
            } else {
              const steelVal = Math.floor(110 + lightFactor * 130);
              ctx.fillStyle = `rgb(${steelVal * 0.45}, ${steelVal * 0.5}, ${steelVal * 0.6})`;
              ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
            }
            ctx.lineWidth = 0.8;
            ctx.fill();
            ctx.stroke();
          } else if (layerType === 'braze') {
            // Sintered Brass/Cobalt Joint Line
            ctx.fillStyle = dieMat.brazeColor;
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 0.6;
            ctx.fill();
            ctx.stroke();
          } else if (layerType === 'nib') {
            // Sintered Carbide / PCD Core
            ctx.fillStyle = dieMat.coreColor;
            ctx.strokeStyle = dieMat.luster;
            ctx.lineWidth = 0.7;
            ctx.fill();
            ctx.stroke();
          } else {
            // Live Drawn Wire with Stress / Realistic Shading
            const midX = (xStart + xEnd) / 2;
            const stressVal = computeStressAtX(midX);

            if (renderMode === 'realistic') {
              const grad = ctx.createLinearGradient(p1.px, p1.py, p3.px, p3.py);
              grad.addColorStop(0, mat.wireGradient[0]);
              grad.addColorStop(0.5, mat.wireGradient[1]);
              grad.addColorStop(1, mat.wireGradient[2]);
              ctx.fillStyle = grad;
              ctx.globalAlpha = Math.min(1.0, lightFactor + specular * 0.6);
            } else if (renderMode === 'heatmap') {
              if (midX >= xConeEnd && midX <= xBearEnd) {
                const amberIntensity = 0.6 + 0.4 * stressVal;
                ctx.fillStyle = `rgba(245, 158, 11, ${amberIntensity})`;
              } else {
                ctx.fillStyle = stressToColor(stressVal);
              }
              ctx.globalAlpha = 0.92;
            } else {
              ctx.fillStyle = stressToColor(stressVal);
              ctx.globalAlpha = 0.85;
            }

            ctx.strokeStyle = renderMode === 'wireframe'
              ? 'rgba(255, 255, 255, 0.5)'
              : 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 0.75;
            ctx.fill();
            ctx.stroke();
            ctx.globalAlpha = 1.0;
          }
        }
      };

      // 1. Draw Outer Stainless Steel Die Casing (DIN 2812 Standard)
      // Main Casing Body
      draw3DCylinderSection(xCasingFront + casingChamfer, xCasingBack - casingChamfer, rDieCasingOuter, rDieCasingOuter, 'casing');
      // Front & Back Bevel Chamfers
      draw3DCylinderSection(xCasingFront, xCasingFront + casingChamfer, rDieCasingOuter - casingChamfer, rDieCasingOuter, 'casing');
      draw3DCylinderSection(xCasingBack - casingChamfer, xCasingBack, rDieCasingOuter, rDieCasingOuter - casingChamfer, 'casing');

      // 2. Draw Sintered Brazing Seat Ring & Carbide Nib Core Body
      draw3DCylinderSection(xCasingFront + 2, xCasingBack - 2, rNibOuter + 2, rNibOuter + 2, 'braze');
      draw3DCylinderSection(xCasingFront + 4, xCasingBack - 4, rNibOuter, rNibOuter, 'nib');

      // 3. Draw Cutaway Cross-Section Hatched Walls (if sliced)
      if (sliceAngleDeg < 360) {
        const cutAngles = [0, maxCutoffRad];
        cutAngles.forEach((cutAngle) => {
          const cosA = Math.cos(cutAngle);
          const sinA = Math.sin(cutAngle);

          // Casing Cut Section Face
          const pC1 = project3D(xCasingFront, (rDieCasingOuter - casingChamfer) * cosA, (rDieCasingOuter - casingChamfer) * sinA);
          const pC2 = project3D(xCasingBack, (rDieCasingOuter - casingChamfer) * cosA, (rDieCasingOuter - casingChamfer) * sinA);
          const pN2 = project3D(xCasingBack, rNibOuter * cosA, rNibOuter * sinA);
          const pN1 = project3D(xCasingFront, rNibOuter * cosA, rNibOuter * sinA);

          ctx.fillStyle = 'rgba(51, 65, 85, 0.85)';
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pC1.px, pC1.py);
          ctx.lineTo(pC2.px, pC2.py);
          ctx.lineTo(pN2.px, pN2.py);
          ctx.lineTo(pN1.px, pN1.py);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Carbide Nib Cut Section Face
          const pB1 = project3D(xCasingFront + 4, rNibOuter * cosA, rNibOuter * sinA);
          const pB2 = project3D(xCasingBack - 4, rNibOuter * cosA, rNibOuter * sinA);
          const pB3 = project3D(xCasingBack - 4, rOut * cosA, rOut * sinA);
          const pB4 = project3D(xCasingFront + 4, rIn * cosA, rIn * sinA);

          ctx.fillStyle = dieMat.coreColor;
          ctx.strokeStyle = dieMat.brazeColor;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(pB1.px, pB1.py);
          ctx.lineTo(pB2.px, pB2.py);
          ctx.lineTo(pB3.px, pB3.py);
          ctx.lineTo(pB4.px, pB4.py);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
      }

      // 4. Draw Continuous Wire with Complete 4-Zone Internal Profile
      // Zone 0: Entry Rod before die
      draw3DCylinderSection(xEntrance, xBellStart, rIn, rIn, 'wire');

      // Zone 1: Bell Entrance Radius (Curved Funnel)
      const stepsBell = 6;
      for (let s = 0; s < stepsBell; s++) {
        const x1 = xBellStart + (s / stepsBell) * (xConeStart - xBellStart);
        const x2 = xBellStart + ((s + 1) / stepsBell) * (xConeStart - xBellStart);
        const t1 = s / stepsBell;
        const t2 = (s + 1) / stepsBell;
        const r1 = rIn + 6 * (1 - Math.sin(t1 * Math.PI * 0.5));
        const r2 = rIn + 6 * (1 - Math.sin(t2 * Math.PI * 0.5));
        draw3DCylinderSection(x1, x2, r1, r2, 'wire');
      }

      // Zone 2: Approach / Reduction Cone (2alpha)
      const stepsCone = 12;
      for (let s = 0; s < stepsCone; s++) {
        const x1 = xConeStart + (s / stepsCone) * (xConeEnd - xConeStart);
        const x2 = xConeStart + ((s + 1) / stepsCone) * (xConeEnd - xConeStart);
        const r1 = rIn - (s / stepsCone) * (rIn - rOut);
        const r2 = rIn - ((s + 1) / stepsCone) * (rIn - rOut);
        draw3DCylinderSection(x1, x2, r1, r2, 'wire');
      }

      // Zone 3: Bearing Cylinder (Parallel Sizing Land Lb)
      draw3DCylinderSection(xConeEnd, xBearEnd, rOut, rOut, 'wire');

      // Zone 4: Back Relief Exit Cone
      const stepsRelief = 6;
      for (let s = 0; s < stepsRelief; s++) {
        const x1 = xBearEnd + (s / stepsRelief) * (xReliefEnd - xBearEnd);
        const x2 = xBearEnd + ((s + 1) / stepsRelief) * (xReliefEnd - xBearEnd);
        const r1 = rOut + (s / stepsRelief) * ((rIn - rOut) * 0.6);
        const r2 = rOut + ((s + 1) / stepsRelief) * ((rIn - rOut) * 0.6);
        draw3DCylinderSection(x1, x2, r1, r2, 'wire');
      }

      // Zone 5: Exit Calibrated Wire
      draw3DCylinderSection(xReliefEnd, xExit, rOut, rOut, 'wire');

      // 5. Central Burst Risk Chevrons (if delta parameter is critical)
      if (isCentralBurstRisk) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.6;
        const numChevrons = 3;
        for (let c = 0; c < numChevrons; c++) {
          const xc = xConeStart + 15 + c * ((xConeEnd - xConeStart - 30) / (numChevrons - 1));
          const pLeft = project3D(xc - 8, 0, 0);
          const pMidTop = project3D(xc, 4, 0);
          const pMidBottom = project3D(xc, -4, 0);
          const pRight = project3D(xc + 8, 0, 0);

          ctx.beginPath();
          ctx.moveTo(pLeft.px, pLeft.py);
          ctx.lineTo(pMidTop.px, pMidTop.py);
          ctx.lineTo(pRight.px, pRight.py);
          ctx.lineTo(pMidBottom.px, pMidBottom.py);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }

      // 6. Animate Ingress Particles
      if (isPlaying) {
        particleOffset = (particleOffset + 1.4) % 40;
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      const stepP = 16;
      for (let px = xEntrance; px < xExit; px += stepP) {
        const offsetPx = px + particleOffset;
        if (offsetPx > xExit) continue;

        let currentR = rIn;
        if (offsetPx >= xConeStart && offsetPx <= xConeEnd) {
          const t = (offsetPx - xConeStart) / (xConeEnd - xConeStart);
          currentR = rIn - t * (rIn - rOut);
        } else if (offsetPx > xConeEnd) {
          currentR = rOut;
        }

        const p = project3D(offsetPx, 0, 0);
        ctx.beginPath();
        ctx.arc(p.px, p.py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 7. CAD Dimension Annotations Overlay (if enabled)
      if (showDimensions) {
        ctx.save();
        ctx.font = 'bold 9px monospace';
        ctx.strokeStyle = '#38bdf8';
        ctx.fillStyle = '#38bdf8';
        ctx.lineWidth = 1;

        // Entrance Diameter (d1)
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

        // Exit Diameter (d2)
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

        // Approach Angle (2alpha)
        const pConeMid = project3D((xConeStart + xConeEnd) / 2, -rDieCasingOuter - 10, 0);
        ctx.fillText(`Approach 2α: ${approachAngle2Alpha}°`, pConeMid.px - 40, pConeMid.py);

        // Bearing Length (Lb)
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

      if (isActuallyPlayingRef.current) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [
    pass, rotationX, rotationY, zoom, panX, panY, isPlaying, renderMode,
    approachAngle2Alpha, bearingLengthLbRatio, sliceAngleDeg,
    wireMaterial, dieNibMaterial, showDimensions,
    displaySize, din, dout, areaRed, alphaRadHalf, deltaParam,
    isCentralBurstRisk, sigmaD, maxStress, bearingLen,
    xConeStart, xConeEnd, xBearEnd, xExit, xEntrance, xBellStart, xReliefEnd,
    xCasingFront, xCasingBack, casingChamfer, rNibOuter, rDieCasingOuter,
    coneLength, rIn, rOut, canvasRef
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
// 3. MAIN WORKBENCH COMPONENT
// =========================================================================
export default function StressHeatmap3D({ passes }: StressHeatmap3DProps) {
  // Navigation mode: 'train' (Multi-Die Sequence) | 'single' (Single Die Zone) | 'compare' (Compare 2 Passes)
  const [activeViewMode, setActiveViewMode] = useState<'train' | 'single' | 'compare'>('train');

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Interaction Tool mode: 'orbit' | 'pan'
  const [navTool, setNavTool] = useState<'orbit' | 'pan'>('orbit');

  const [selectedPassIdx, setSelectedPassIdx] = useState<number>(0);
  const [comparePassIdxA, setComparePassIdxA] = useState<number>(0);
  const [comparePassIdxB, setComparePassIdxB] = useState<number>(Math.min(1, passes.length - 1));

  // CAD 3D Camera Angles, Pan & Zoom
  const [rotationX, setRotationX] = useState<number>(22);
  const [rotationY, setRotationY] = useState<number>(-28);
  const [zoom, setZoom] = useState<number>(1.0);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
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
  const [renderMode, setRenderMode] = useState<'realistic' | 'heatmap' | 'wireframe' | 'shear'>('realistic');
  const [showDimensions, setShowDimensions] = useState<boolean>(true);

  // Mouse Dragging States
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragButton, setDragButton] = useState<number>(0); // 0: left, 1: middle, 2: right
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Hover Telemetry States
  const [trainHoverInfo, setTrainHoverInfo] = useState<TrainHoverInfo | null>(null);
  const [singleHoverInfo, setSingleHoverInfo] = useState<HoverInfo | null>(null);
  const [hoverInfoA, setHoverInfoA] = useState<HoverInfo | null>(null);
  const [hoverInfoB, setHoverInfoB] = useState<HoverInfo | null>(null);

  // Outer Wrapper Ref
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mainContainerRef = useRef<HTMLDivElement | null>(null);
  const trainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const singleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);

  // Non-passive wheel listener for smooth CAD-style mouse scroll zoom
  useEffect(() => {
    const container = mainContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // CAD Zoom: scroll up -> zoom in, scroll down -> zoom out
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      setZoom((prev) => Math.max(0.25, Math.min(5.0, Number((prev * factor).toFixed(3)))));
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

  // Synchronize with browser native fullscreen events & key shortcuts
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
        setZoom((z) => Math.min(5.0, z + 0.15));
      }
      if (e.key === '-' || e.key === '_') {
        setZoom((z) => Math.max(0.25, z - 0.15));
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, toggleFullscreen]);

  // Zoom Extents / Fit to View
  const fitView = () => {
    setRotationX(22);
    setRotationY(-28);
    setPanX(0);
    setPanY(0);
    setZoom(1.0);
  };

  // Center Camera onto Selected Die Station
  const focusSelectedPass = () => {
    const N = passes.length;
    const stationSpacing = Math.max(95, Math.min(140, 1050 / Math.max(N, 1)));
    const totalLength = (N - 1) * stationSpacing;
    const startX = -totalLength / 2;
    const targetX = startX + selectedPassIdx * stationSpacing;
    setPanX(-targetX);
    setPanY(0);
    setZoom(1.8);
  };

  // View Angle Presets
  const setViewPreset = (preset: 'iso' | 'side' | 'top' | 'front') => {
    switch (preset) {
      case 'iso':
        setRotationX(22);
        setRotationY(-28);
        setPanX(0);
        setPanY(0);
        setZoom(1.0);
        break;
      case 'side':
        setRotationX(0);
        setRotationY(0);
        setPanX(0);
        setPanY(0);
        setZoom(1.05);
        break;
      case 'top':
        setRotationX(85);
        setRotationY(0);
        setPanX(0);
        setPanY(0);
        setZoom(0.95);
        break;
      case 'front':
        setRotationX(10);
        setRotationY(-80);
        setPanX(0);
        setPanY(0);
        setZoom(1.1);
        break;
    }
  };

  // Snapshot exporter
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

  // Mouse drag orbit/pan handlers with CAD multi-button support
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragButton(e.button);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    const isPanning = dragButton === 1 || dragButton === 2 || e.shiftKey || navTool === 'pan';

    if (isPanning) {
      const panSensitivity = 1.0 / Math.max(0.2, zoom);
      setPanX((prev) => prev + deltaX * panSensitivity);
      setPanY((prev) => prev + deltaY * panSensitivity);
    } else {
      setRotationY((prev) => prev + deltaX * 0.4);
      setRotationX((prev) => Math.max(-85, Math.min(85, prev - deltaY * 0.4)));
    }
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

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

  // Physics telemetry for current single pass
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
              {isFullscreen && (
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  FULLSCREEN (ESC / F)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 m-0 mt-0.5">
              Photorealistic CAD assembly &bull; Tungsten Carbide / PCD Nibs &bull; Scroll to Zoom &bull; Drag to Orbit
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
            onClick={handleTakeSnapshot}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition shadow-sm cursor-pointer"
            title="Download PNG Snapshot"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Snapshot</span>
          </button>

          {/* Fullscreen Trigger Button */}
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
        {/* Wire & Die Material Selectors */}
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
            {/* CAD Camera Views */}
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

            {/* Feature Toggles */}
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

            {/* Line Speed Feed */}
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
            {/* Shading Mode Tabs */}
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
        {/* Render Canvas Area with Full CAD Navigation */}
        <div
          ref={mainContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            cursor: isDragging
              ? (dragButton === 1 || dragButton === 2 || navTool === 'pan' ? 'move' : 'grabbing')
              : (navTool === 'pan' ? 'grab' : 'crosshair'),
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
                rotationX={rotationX}
                rotationY={rotationY}
                zoom={zoom}
                panX={panX}
                panY={panY}
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
                rotationX={rotationX}
                rotationY={rotationY}
                zoom={zoom}
                panX={panX}
                panY={panY}
                isPlaying={isPlaying}
                renderMode={renderMode}
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
                  rotationX={rotationX}
                  rotationY={rotationY}
                  zoom={zoom}
                  panX={panX}
                  panY={panY}
                  isPlaying={isPlaying}
                  renderMode={renderMode}
                  wireMaterial={wireMaterial}
                  dieNibMaterial={dieNibMaterial}
                  showDimensions={false}
                  canvasRef={canvasRefA}
                  onHover={setHoverInfoA}
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
                  rotationX={rotationX}
                  rotationY={rotationY}
                  zoom={zoom}
                  panX={panX}
                  panY={panY}
                  isPlaying={isPlaying}
                  renderMode={renderMode}
                  wireMaterial={wireMaterial}
                  dieNibMaterial={dieNibMaterial}
                  showDimensions={false}
                  canvasRef={canvasRefB}
                  onHover={setHoverInfoB}
                />
              </div>
            </div>
          )}

          {/* Top-Left CAD Toolbar: Play, Orbit, Pan, Zoom, Focus, Fit, Reset */}
          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-20 bg-slate-900/85 backdrop-blur p-1.5 rounded-xl border border-slate-800 shadow-xl">
            {/* Play/Pause Feed */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition cursor-pointer"
              title={isPlaying ? 'Pause wire feed' : 'Start wire feed'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

            {/* Orbit Tool */}
            <button
              onClick={() => setNavTool('orbit')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                navTool === 'orbit' ? 'bg-purple-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Orbit 3D (Left Drag)"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>

            {/* Pan Tool */}
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

            {/* Zoom In */}
            <button
              onClick={() => setZoom((z) => Math.min(5.0, Number((z * 1.2).toFixed(2))))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition cursor-pointer"
              title="Zoom In (Scroll Up or +)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {/* Zoom Out */}
            <button
              onClick={() => setZoom((z) => Math.max(0.25, Number((z * 0.83).toFixed(2))))}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition cursor-pointer"
              title="Zoom Out (Scroll Down or -)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* Focus Station */}
            <button
              onClick={focusSelectedPass}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-400 border border-slate-700/60 transition cursor-pointer"
              title="Focus Camera on Selected Die Station"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>

            {/* Fit View */}
            <button
              onClick={fitView}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700/60 transition cursor-pointer"
              title="Fit to Window / Reset CAD View"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>

            {/* Reset */}
            <button
              onClick={fitView}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition cursor-pointer"
              title="Reset Angles"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Zoom Percent readout */}
            <span className="text-[10px] font-mono font-bold text-slate-400 px-1.5">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Bottom Legend / Instructions */}
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

          {/* Granular Zoom Slider in Sidebar */}
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-400">CAD View Zoom:</span>
              <span className="text-cyan-400 font-bold">{Math.round(zoom * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.25"
              max="4.0"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
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

          {/* Educational Explainer Accordion */}
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

// Helper to safely get container width
function displaySizeW(ref: React.RefObject<HTMLDivElement | null>): number {
  return ref.current?.getBoundingClientRect().width ?? 600;
}
