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
  isPlaying,
  speedRate,
  showCapstans,
  showLabels,
  showVelocityTags,
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
  isPlaying: boolean;
  speedRate: number;
  showCapstans: boolean;
  showLabels: boolean;
  showVelocityTags: boolean;
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
  const stationSpacing = Math.max(85, Math.min(130, 950 / Math.max(N, 1)));
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
    
    // Graphical radius scaling (normalized so thin wires are still visible)
    const rawRin = (din / initialDia) * 14;
    const rawRout = (dout / initialDia) * 14;
    const rIn = Math.max(2.5, rawRin);
    const rOut = Math.max(1.5, rawRout);

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
    let minDistance = 45; // pixel threshold

    stations.forEach((st) => {
      const x1 = (st.x + panX) * Math.cos(radY);
      const z1 = -(st.x + panX) * Math.sin(radY);
      const y2 = 0 - z1 * Math.sin(radX);
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
  }, [canvasRef, displaySize, stations, rotationX, rotationY, zoom, panX, onHoverStation]);

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
    let minDistance = 40;

    stations.forEach((st) => {
      const x1 = (st.x + panX) * Math.cos(radY);
      const z1 = -(st.x + panX) * Math.sin(radY);
      const y2 = 0 - z1 * Math.sin(radX);
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
  }, [canvasRef, displaySize, stations, rotationX, rotationY, zoom, panX, onSelectPass]);

  // Main 3D Animation & Rendering Loop
  useEffect(() => {
    let animId: number;
    let flowTime = 0;

    // Particle flow pool
    const numParticles = Math.min(80, Math.max(30, N * 5));
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

      // Background gradient
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, width * 0.8);
      bgGrad.addColorStop(0, '#0a0f1d');
      bgGrad.addColorStop(1, '#030509');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Shopfloor Machine Bed Grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.25)';
      ctx.lineWidth = 1;
      const gridSpacing = 45;
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
        const x1 = xOffset * Math.cos(radY) + z * Math.sin(radY);
        const z1 = -xOffset * Math.sin(radY) + z * Math.cos(radY);
        const y2 = y * Math.cos(radX) - z1 * Math.sin(radX);
        const z2 = y * Math.sin(radX) + z1 * Math.cos(radX);
        return {
          px: x1 * zoom,
          py: y2 * zoom,
          depth: z2,
        };
      };

      // 1. Draw Machine Rail / Foundation Bed
      const lineLeft = startX - 70;
      const lineRight = startX + (N - 1) * stationSpacing + 70;
      const railY = 32;
      const railDepth = 24;

      const b1 = project(lineLeft, railY, -railDepth);
      const b2 = project(lineRight, railY, -railDepth);
      const b3 = project(lineRight, railY + 8, -railDepth);
      const b4 = project(lineLeft, railY + 8, -railDepth);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(b1.px, b1.py);
      ctx.lineTo(b2.px, b2.py);
      ctx.lineTo(b3.px, b3.py);
      ctx.lineTo(b4.px, b4.py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Top surface of machine bed
      const t1 = project(lineLeft, railY, -railDepth);
      const t2 = project(lineRight, railY, -railDepth);
      const t3 = project(lineRight, railY, railDepth);
      const t4 = project(lineLeft, railY, railDepth);

      ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.beginPath();
      ctx.moveTo(t1.px, t1.py);
      ctx.lineTo(t2.px, t2.py);
      ctx.lineTo(t3.px, t3.py);
      ctx.lineTo(t4.px, t4.py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Guide track centerline
      const c1 = project(lineLeft, railY - 0.5, 0);
      const c2 = project(lineRight, railY - 0.5, 0);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(c1.px, c1.py);
      ctx.lineTo(c2.px, c2.py);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Draw Wire Segments
      const drawWireCylinder = (
        xStart: number,
        xEnd: number,
        rStart: number,
        rEnd: number,
        colorStart: string,
        colorEnd: string
      ) => {
        const segments = 16;
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

          const normalY = Math.cos((a1 + a2) / 2);
          const normalZ = Math.sin((a1 + a2) / 2);
          const lightFactor = Math.max(0.2, 0.5 + 0.5 * normalY + 0.2 * normalZ);

          const grad = ctx.createLinearGradient(p1.px, p1.py, p3.px, p3.py);
          grad.addColorStop(0, colorStart);
          grad.addColorStop(1, colorEnd);

          ctx.fillStyle = grad;
          ctx.globalAlpha = 0.85 * lightFactor;
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      };

      // Entrance raw wire
      const firstSt = stations[0];
      if (firstSt) {
        drawWireCylinder(
          lineLeft,
          firstSt.x - 12,
          firstSt.rIn,
          firstSt.rIn,
          '#b45309',
          '#d97706'
        );
      }

      // Span between dies
      for (let i = 0; i < N; i++) {
        const curr = stations[i];
        const next = stations[i + 1];

        // Conical Reduction Zone inside die nib
        const coneStart = curr.x - 12;
        const coneEnd = curr.x + 8;
        drawWireCylinder(
          coneStart,
          coneEnd,
          curr.rIn,
          curr.rOut,
          '#f59e0b',
          '#ec4899'
        );

        // Wire running to next die
        if (next) {
          const wireColor = i % 2 === 0 ? '#38bdf8' : '#60a5fa';
          drawWireCylinder(
            coneEnd,
            next.x - 12,
            curr.rOut,
            curr.rOut,
            '#0284c7',
            wireColor
          );
        }
      }

      // Exit fine wire
      const lastSt = stations[N - 1];
      if (lastSt) {
        drawWireCylinder(
          lastSt.x + 8,
          lineRight,
          lastSt.rOut,
          lastSt.rOut,
          '#38bdf8',
          '#a855f7'
        );
      }

      // 3. Draw Capstan Pulling Drums between stands (if enabled)
      if (showCapstans) {
        for (let i = 0; i < N - 1; i++) {
          const stA = stations[i];
          const stB = stations[i + 1];
          const capstanX = (stA.x + stB.x) / 2;
          const capstanY = 16;
          const capstanR = 14;
          const capstanZ = 16;

          const drumCenter = project(capstanX, capstanY, capstanZ);
          const drumRotSpeed = flowTime * (stA.speedMultiplier * 0.08);

          // Drum body
          ctx.beginPath();
          ctx.arc(drumCenter.px, drumCenter.py, capstanR * zoom, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
          ctx.lineWidth = 1.2;
          ctx.fill();
          ctx.stroke();

          // Spoke lines for spinning visual
          for (let s = 0; s < 4; s++) {
            const angle = drumRotSpeed + (s * Math.PI) / 2;
            const spokeX = drumCenter.px + Math.cos(angle) * (capstanR * 0.85 * zoom);
            const spokeY = drumCenter.py + Math.sin(angle) * (capstanR * 0.85 * zoom);
            ctx.beginPath();
            ctx.moveTo(drumCenter.px, drumCenter.py);
            ctx.lineTo(spokeX, spokeY);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // Central bolt
          ctx.beginPath();
          ctx.arc(drumCenter.px, drumCenter.py, 3 * zoom, 0, Math.PI * 2);
          ctx.fillStyle = '#38bdf8';
          ctx.fill();
        }
      }

      // 4. Draw Die Stands & Casings
      stations.forEach((st) => {
        const isSelected = st.idx === selectedPassIdx;
        const housingR = Math.max(22, st.rIn + 12);
        const housingThickness = 16;
        const xStandStart = st.x - housingThickness / 2;
        const xStandEnd = st.x + housingThickness / 2;

        // Stand pedestal mounting to bed
        const pMountL = project(st.x - 10, railY, -12);
        const pMountR = project(st.x + 10, railY, 12);
        const pDieBottom = project(st.x, housingR, 0);

        ctx.strokeStyle = isSelected ? '#a855f7' : 'rgba(71, 85, 105, 0.6)';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(pMountL.px, pMountL.py);
        ctx.lineTo(pDieBottom.px, pDieBottom.py);
        ctx.lineTo(pMountR.px, pMountR.py);
        ctx.stroke();

        // Outer Die Ring Housing
        const segs = 18;
        for (let s = 0; s < segs; s++) {
          const a1 = (s / segs) * Math.PI * 2;
          const a2 = ((s + 1) / segs) * Math.PI * 2;

          const y1 = housingR * Math.cos(a1);
          const z1 = housingR * Math.sin(a1);
          const y2 = housingR * Math.cos(a2);
          const z2 = housingR * Math.sin(a2);

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

          if (isSelected) {
            ctx.fillStyle = 'rgba(147, 51, 234, 0.45)';
            ctx.strokeStyle = '#c084fc';
          } else {
            ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
            ctx.strokeStyle = 'rgba(71, 85, 105, 0.8)';
          }
          ctx.lineWidth = isSelected ? 1.5 : 0.8;
          ctx.fill();
          ctx.stroke();
        }

        // Selected station glowing halo
        if (isSelected) {
          const centerPos = project(st.x, 0, 0);
          ctx.save();
          ctx.beginPath();
          ctx.arc(centerPos.px, centerPos.py, (housingR + 8) * zoom, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.8)';
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.restore();
        }

        // 5. Pass Number Tag & Dimensions
        if (showLabels) {
          const topPos = project(st.x, -housingR - 10, 0);
          ctx.save();
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';

          // Badge background
          ctx.fillStyle = isSelected ? '#7e22ce' : '#0f172a';
          ctx.strokeStyle = isSelected ? '#d8b4fe' : '#334155';
          ctx.lineWidth = 1;

          const tagText = `P${st.pass}`;
          const textW = ctx.measureText(tagText).width + 8;
          ctx.beginPath();
          ctx.roundRect(topPos.px - textW / 2, topPos.py - 12, textW, 14, 3);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
          ctx.fillText(tagText, topPos.px, topPos.py - 2);

          // Diameter callout
          ctx.font = '8px monospace';
          ctx.fillStyle = isSelected ? '#c084fc' : '#64748b';
          ctx.fillText(`Ø${st.dout.toFixed(2)}`, topPos.px, topPos.py + 10);
          ctx.restore();
        }

        // Velocity Speed Tag below bed
        if (showVelocityTags) {
          const botPos = project(st.x, railY + 16, 0);
          ctx.save();
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#38bdf8';
          ctx.fillText(`${st.speedMultiplier.toFixed(1)}x`, botPos.px, botPos.py);
          ctx.restore();
        }
      });

      // 6. Animate Speed-Proportional Flow Particles
      if (isPlaying) {
        flowTime += 0.8 * speedRate;
      }

      particles.forEach((pt) => {
        if (isPlaying) {
          pt.normPos = (pt.normPos + 0.003 * speedRate) % 1.0;
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

        const streakLen = Math.min(24, 4 * Math.sqrt(localSpeedMult)) * zoom;
        const tailPos = project(currentLineX - streakLen, partY, partZ);

        ctx.beginPath();
        ctx.moveTo(tailPos.px, tailPos.py);
        ctx.lineTo(pPos.px, pPos.py);
        ctx.strokeStyle = `rgba(244, 114, 182, ${Math.min(1.0, 0.4 + localSpeedMult * 0.05)})`;
        ctx.lineWidth = Math.max(1, 2 * (localRadius / 14));
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pPos.px, pPos.py, Math.max(1.2, 2.2 * (localRadius / 14)), 0, Math.PI * 2);
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
    passes, stations, selectedPassIdx, rotationX, rotationY, zoom, panX,
    isPlaying, speedRate, showCapstans, showLabels, showVelocityTags,
    displaySize, N, startX, stationSpacing, initialDia, initialArea,
    canvasRef
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
// 2. SINGLE DIE DEEP DEFORMATION ZONE CANVAS
// =========================================================================
const SingleDieCanvas = React.memo(function SingleDieCanvas({
  pass,
  approachAngle2Alpha,
  bearingLengthLbRatio,
  sliceAngleDeg,
  rotationX,
  rotationY,
  zoom,
  isPlaying,
  renderMode,
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
  isPlaying: boolean;
  renderMode: 'heatmap' | 'wireframe' | 'shear';
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

  const scaleR = 18;
  const rIn = (din / 2) * scaleR;
  const rOut = (dout / 2) * scaleR;
  const coneLength = Math.max(30, Math.min(120, (rIn - rOut) / Math.tan(Math.max(alphaRadHalf, 0.01))));
  const bearingLen = (bearingLengthLbRatio / 100) * dout * scaleR;
  const xEntrance = -180;
  const xConeStart = -coneLength / 2;
  const xConeEnd = coneLength / 2;
  const xBearEnd = xConeEnd + bearingLen;
  const xExit = Math.max(xBearEnd + 100, xConeEnd + 200);

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

      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width / 1.2);
      bgGrad.addColorStop(0, '#090D16');
      bgGrad.addColorStop(1, '#030509');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(30, 41, 59, 0.3)';
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
      ctx.scale(zoom, zoom);

      const radX = (rotationX * Math.PI) / 180;
      const radY = (rotationY * Math.PI) / 180;

      const project3D = (x: number, y: number, z: number) => {
        const x1 = x * Math.cos(radY) + z * Math.sin(radY);
        const z1 = -x * Math.sin(radY) + z * Math.cos(radY);
        const y2 = y * Math.cos(radX) - z1 * Math.sin(radX);
        return { px: x1, py: y2 };
      };

      const numSegments = 36;
      const maxCutoffRad = (sliceAngleDeg * Math.PI) / 180;

      const stressToColor = (stressVal: number): string => {
        if (renderMode === 'wireframe') return 'rgba(59, 130, 246, 0.3)';
        if (renderMode === 'shear') return `rgba(16, 185, 129, ${0.3 + stressVal * 0.6})`;
        const clamped = Math.max(0, Math.min(1, stressVal));
        if (clamped > 0.85) return '#EC4899';
        if (clamped > 0.7) return '#EF4444';
        if (clamped > 0.5) return '#F59E0B';
        if (clamped > 0.35) return '#10B981';
        return '#3B82F6';
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

      const draw3DCylinderSection = (
        xStart: number,
        xEnd: number,
        rStart: number,
        rEnd: number,
        isDie: boolean
      ) => {
        for (let i = 0; i < numSegments; i++) {
          const angle1 = (i / numSegments) * Math.PI * 2;
          const angle2 = ((i + 1) / numSegments) * Math.PI * 2;

          if (isDie && angle1 > maxCutoffRad) continue;

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

          if (isDie) {
            ctx.fillStyle = renderMode === 'wireframe'
              ? 'rgba(15, 23, 42, 0.35)'
              : 'rgba(30, 41, 59, 0.65)';
            ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
            ctx.lineWidth = 1;
            ctx.fill();
            ctx.stroke();
          } else {
            const midX = (xStart + xEnd) / 2;
            const stressVal = computeStressAtX(midX);

            if (midX >= xConeEnd && midX <= xBearEnd) {
              if (renderMode === 'heatmap') {
                const amberIntensity = 0.6 + 0.4 * stressVal;
                ctx.fillStyle = `rgba(245, 158, 11, ${amberIntensity})`;
              } else {
                ctx.fillStyle = stressToColor(stressVal);
              }
            } else {
              ctx.fillStyle = stressToColor(stressVal);
            }

            ctx.strokeStyle = renderMode === 'wireframe'
              ? 'rgba(255, 255, 255, 0.4)'
              : 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 0.75;
            ctx.fill();
            ctx.stroke();
          }
        }
      };

      const rDieOuter = rIn + 45;
      draw3DCylinderSection(xEntrance, xExit, rDieOuter, rDieOuter, true);
      draw3DCylinderSection(xEntrance, xConeStart, rIn, rIn, false);

      const stepsCone = 10;
      for (let s = 0; s < stepsCone; s++) {
        const x1 = xConeStart + (s / stepsCone) * (xConeEnd - xConeStart);
        const x2 = xConeStart + ((s + 1) / stepsCone) * (xConeEnd - xConeStart);
        const r1 = rIn - (s / stepsCone) * (rIn - rOut);
        const r2 = rIn - ((s + 1) / stepsCone) * (rIn - rOut);
        draw3DCylinderSection(x1, x2, r1, r2, false);
      }

      draw3DCylinderSection(xConeEnd, xBearEnd, rOut, rOut, false);
      draw3DCylinderSection(xBearEnd, xExit, rOut, rOut, false);

      if (isCentralBurstRisk) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 1.5;
        const numChevrons = 3;
        for (let c = 0; c < numChevrons; c++) {
          const xc = xConeStart + 15 + c * ((xConeEnd - xConeStart - 30) / (numChevrons - 1));
          const pLeft = project3D(xc - 8, 0, 0);
          const pMidTop = project3D(xc, 3, 0);
          const pMidBottom = project3D(xc, -3, 0);
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

      if (isPlaying) {
        particleOffset = (particleOffset + 1.2) % 40;
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      const stepP = 15;
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
    pass, rotationX, rotationY, zoom, isPlaying, renderMode,
    approachAngle2Alpha, bearingLengthLbRatio, sliceAngleDeg,
    displaySize, din, dout, areaRed, alphaRadHalf, deltaParam,
    isCentralBurstRisk, sigmaD, maxStress, bearingLen,
    xConeStart, xConeEnd, xBearEnd, xExit, xEntrance,
    coneLength, rIn, rOut, canvasRef
  ]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[340px] relative flex flex-col items-center justify-center"
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

  const [selectedPassIdx, setSelectedPassIdx] = useState<number>(0);
  const [comparePassIdxA, setComparePassIdxA] = useState<number>(0);
  const [comparePassIdxB, setComparePassIdxB] = useState<number>(Math.min(1, passes.length - 1));

  // 3D Camera Angles & Pan
  const [rotationX, setRotationX] = useState<number>(22);
  const [rotationY, setRotationY] = useState<number>(-28);
  const [zoom, setZoom] = useState<number>(1.0);
  const [panX, setPanX] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedRate, setSpeedRate] = useState<number>(1.0);

  // Train specific visual toggles
  const [showCapstans, setShowCapstans] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showVelocityTags, setShowVelocityTags] = useState<boolean>(true);
  const [showExplainer, setShowExplainer] = useState<boolean>(true);

  // Single Die specific parameters
  const [approachAngle2Alpha, setApproachAngle2Alpha] = useState<number>(14);
  const [bearingLengthLbRatio, setBearingLengthLbRatio] = useState<number>(35);
  const [sliceAngleDeg, setSliceAngleDeg] = useState<number>(270);
  const [renderMode, setRenderMode] = useState<'heatmap' | 'wireframe' | 'shear'>('heatmap');

  // Mouse Dragging States
  const [isDragging, setIsDragging] = useState<boolean>(false);
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

  // Toggle Fullscreen Viewport Mode
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      if (wrapperRef.current && wrapperRef.current.requestFullscreen) {
        wrapperRef.current.requestFullscreen().catch(() => {
          // Fallback to CSS overlay mode if browser blocks native fullscreen
        });
      }
    } else {
      setIsFullscreen(false);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [isFullscreen]);

  // Synchronize with browser native fullscreen events
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
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, toggleFullscreen]);

  // View Angle Presets
  const setViewPreset = (preset: 'iso' | 'side' | 'top' | 'front') => {
    switch (preset) {
      case 'iso':
        setRotationX(22);
        setRotationY(-28);
        setPanX(0);
        setZoom(1.0);
        break;
      case 'side':
        setRotationX(0);
        setRotationY(0);
        setPanX(0);
        setZoom(1.05);
        break;
      case 'top':
        setRotationX(85);
        setRotationY(0);
        setPanX(0);
        setZoom(0.95);
        break;
      case 'front':
        setRotationX(10);
        setRotationY(-80);
        setPanX(0);
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

  // Mouse drag orbit/pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    if (e.shiftKey) {
      setPanX((prev) => prev + deltaX * 0.8);
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
  const deltaParam = (approachAngle2Alpha * Math.PI / 180 / rFrac) * (1 + Math.sqrt(1 - rFrac));

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
                3D Multi-Pass Wire Drawing Workbench
              </h3>
              <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {passes.length} Passes Active
              </span>
              {isFullscreen && (
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  FULLSCREEN MODE (ESC to exit)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 m-0 mt-0.5">
              Interactive 3D simulation of continuous wire drawing across sequential dies & capstan stands
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

      {/* Mode Specific Controls & Toolbars */}
      {activeViewMode === 'train' && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-900 text-xs font-mono shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] font-bold mr-1">3D View:</span>
            {[
              { id: 'iso' as const, label: 'Isometric' },
              { id: 'side' as const, label: 'Side Elevation' },
              { id: 'top' as const, label: 'Top Floor' },
              { id: 'front' as const, label: 'Line Ingress' },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setViewPreset(v.id)}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded text-[10px] font-bold transition cursor-pointer"
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={showCapstans}
                onChange={(e) => setShowCapstans(e.target.checked)}
                className="rounded border-slate-700 text-purple-600 focus:ring-0"
              />
              <span>Capstan Drums</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="rounded border-slate-700 text-purple-600 focus:ring-0"
              />
              <span>Die Badges</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={showVelocityTags}
                onChange={(e) => setShowVelocityTags(e.target.checked)}
                className="rounded border-slate-700 text-purple-600 focus:ring-0"
              />
              <span>Speed Tags</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Line Speed:</span>
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
                <span>Cutaway Slice:</span>
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
        {/* Render Canvas Area */}
        <div
          ref={mainContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
          className={`${
            isFullscreen ? 'lg:col-span-8 xl:col-span-9 h-full' : 'lg:col-span-8 min-h-[420px]'
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
                isPlaying={isPlaying}
                speedRate={speedRate}
                showCapstans={showCapstans}
                showLabels={showLabels}
                showVelocityTags={showVelocityTags}
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
                isPlaying={isPlaying}
                renderMode={renderMode}
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
                  isPlaying={isPlaying}
                  renderMode={renderMode}
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
                  isPlaying={isPlaying}
                  renderMode={renderMode}
                  canvasRef={canvasRefB}
                  onHover={setHoverInfoB}
                />
              </div>
            </div>
          )}

          {/* Top-Left Play / Zoom / Reset Controls */}
          <div className="absolute top-3 left-3 flex items-center space-x-1.5 z-20">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800/80 transition cursor-pointer"
              title={isPlaying ? 'Pause wire feed' : 'Start wire feed'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(3.0, z + 0.15))}
              className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800/80 transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.3, z - 0.15))}
              className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800/80 transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setViewPreset('iso');
              }}
              className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800/80 transition cursor-pointer"
              title="Reset 3D View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bottom Legend / Instructions */}
          <div className="absolute bottom-3 left-3 right-3 bg-slate-900/85 backdrop-blur border border-slate-800/80 px-3.5 py-1.5 rounded-xl flex items-center justify-between text-[10px] font-mono z-20">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Drag to orbit 3D &bull; Shift+Drag to pan &bull; Click any die station to inspect &bull; Press <strong>F</strong> for Fullscreen</span>
            </div>
            {activeViewMode === 'single' && (
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
