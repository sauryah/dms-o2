import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  RotateCcw,
  Play,
  Pause,
  Sparkles,
  Activity,
  AlertTriangle,
  Camera,
  Scissors,
  Thermometer,
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

// Physical and material constants for wire drawing stress calculations
const STRENGTH_COEFFICIENT_K = 315;      // K parameter (MPa)
const HARDENING_EXPONENT_N = 0.54;       // n exponent
const FRICTION_COEFFICIENT_MU = 0.04;     // mu coefficient

// Sub-component to render a single 3D cylinder pass on its own canvas
const PassVisualizerCanvas = React.memo(function PassVisualizerCanvas({
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

  // ResizeObserver to handle fluid size changes
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

  // Update canvas scale for high DPI displays
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = displaySize.w * dpr;
    canvas.height = displaySize.h * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
  }, [displaySize, canvasRef]);

  // Sync play state
  useEffect(() => {
    const onVisChange = () => {
      if (document.hidden) {
        isActuallyPlayingRef.current = false;
      } else if (isPlaying) {
        isActuallyPlayingRef.current = true;
      }
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, [isPlaying]);

  useEffect(() => {
    isActuallyPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Mechanics model variables
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

  // Mouse hover event coordinates translation
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

  // Render loop
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

      // Background gradient
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width / 1.2);
      bgGrad.addColorStop(0, '#090D16');
      bgGrad.addColorStop(1, '#030509');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Grid lines
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

      // Outer die shell
      const rDieOuter = rIn + 45;
      draw3DCylinderSection(xEntrance, xExit, rDieOuter, rDieOuter, true);

      // Wire segments
      draw3DCylinderSection(xEntrance, xConeStart, rIn, rIn, false);

      // Cone taper
      const stepsCone = 10;
      for (let s = 0; s < stepsCone; s++) {
        const x1 = xConeStart + (s / stepsCone) * (xConeEnd - xConeStart);
        const x2 = xConeStart + ((s + 1) / stepsCone) * (xConeEnd - xConeStart);
        const r1 = rIn - (s / stepsCone) * (rIn - rOut);
        const r2 = rIn - ((s + 1) / stepsCone) * (rIn - rOut);
        draw3DCylinderSection(x1, x2, r1, r2, false);
      }

      // Bearing land
      draw3DCylinderSection(xConeEnd, xBearEnd, rOut, rOut, false);

      // Exit segment
      draw3DCylinderSection(xBearEnd, xExit, rOut, rOut, false);

      // Internal Chevron Defects (if burst risk is high)
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

      // Render flow particles
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

        if (renderMode === 'shear') {
          const pPerim1 = project3D(offsetPx, currentR, 0);
          const pPerim2 = project3D(offsetPx + 10, currentR * 0.9, 10);
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pPerim1.px, pPerim1.py);
          ctx.lineTo(pPerim2.px, pPerim2.py);
          ctx.stroke();
        }
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
        ref={canvasRef}
        className="w-full h-full block select-none rounded-lg"
      />
    </div>
  );
});

export default function StressHeatmap3D({ passes }: StressHeatmap3DProps) {
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [selectedPassIdx, setSelectedPassIdx] = useState<number>(0);
  const [comparePassIdxA, setComparePassIdxA] = useState<number>(0);
  const [comparePassIdxB, setComparePassIdxB] = useState<number>(Math.min(1, passes.length - 1));

  // Shared 3D camera states
  const [rotationX, setRotationX] = useState<number>(20);
  const [rotationY, setRotationY] = useState<number>(-35);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [renderMode, setRenderMode] = useState<'heatmap' | 'wireframe' | 'shear'>('heatmap');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [approachAngle2Alpha, setApproachAngle2Alpha] = useState<number>(14);
  const [bearingLengthLbRatio, setBearingLengthLbRatio] = useState<number>(35);
  const [sliceAngleDeg, setSliceAngleDeg] = useState<number>(270);

  const [hoverInfoA, setHoverInfoA] = useState<HoverInfo | null>(null);
  const [hoverInfoB, setHoverInfoB] = useState<HoverInfo | null>(null);
  const [singleHoverInfo, setSingleHoverInfo] = useState<HoverInfo | null>(null);

  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const singleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mainContainerRef = useRef<HTMLDivElement | null>(null);

  // Snapshot captures all active canvases
  const handleTakeSnapshot = () => {
    const canvases = [singleCanvasRef.current, canvasRefA.current, canvasRefB.current].filter(Boolean);
    if (canvases.length === 0) return;
    
    canvases.forEach((canvas, idx) => {
      if (!canvas) return;
      const imageURI = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = compareMode 
        ? `DMS_3D_Stress_Comparison_Pane_${idx + 1}.png` 
        : `DMS_3D_Stress_Heatmap_Pass_${passes[selectedPassIdx]?.pass || 1}.png`;
      link.href = imageURI;
      link.click();
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    setRotationY((prev) => prev + deltaX * 0.5);
    setRotationX((prev) => Math.max(-80, Math.min(80, prev - deltaY * 0.5)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  if (!passes || passes.length === 0) {
    return (
      <div className="wdc-panel bg-[#050913]/90 border border-slate-900 rounded-xl p-12 text-center">
        <Activity className="h-8 w-8 text-slate-600 mx-auto mb-3 text-purple-400" />
        <p className="text-slate-400 text-sm">No pass data available. Generate a die schedule to view the 3D stress model.</p>
      </div>
    );
  }

  const activePassA = passes[comparePassIdxA] || passes[0];
  const activePassB = passes[comparePassIdxB] || passes[0];
  const activePassSingle = passes[selectedPassIdx] || passes[0];

  const calculateDelta = (vA: number, vB: number) => {
    const delta = vB - vA;
    if (delta === 0) return '—';
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(3)}`;
  };

  const activePass = compareMode ? activePassA : activePassSingle;
  const din = activePass?.fromDie ?? 3.0;
  const dout = activePass?.toDie ?? 2.5;
  const areaRed = activePass?.areaReduction ?? 0;
  const rFrac = Math.max(0.01, Math.min(0.9, areaRed / 100));
  const alphaRadHalf = ((approachAngle2Alpha / 2) * Math.PI) / 180;
  const deltaParam = (approachAngle2Alpha * Math.PI / 180 / rFrac) * (1 + Math.sqrt(1 - rFrac));
  const isCentralBurstRisk = deltaParam > 3.0 || approachAngle2Alpha > 18 || areaRed > 24;

  const K = STRENGTH_COEFFICIENT_K;
  const nPow = HARDENING_EXPONENT_N;
  const epsilon = Math.log(1 / (1 - rFrac));
  const sigmaFlow = K * Math.pow(Math.max(epsilon, 0.001), nPow) / (nPow + 1);
  const phi = 0.88 + 0.12 * ((alphaRadHalf * 2) / rFrac) * (1 - rFrac);
  const sigmaD = sigmaFlow * phi * epsilon * (1 + FRICTION_COEFFICIENT_MU / Math.tan(Math.max(alphaRadHalf, 0.01)));
  const maxStress = sigmaFlow * 2.5;
  const deltaT = (sigmaD * epsilon) / (8960 * 385) * 1e6;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="wdc-panel bg-[#050913]/90 border border-slate-900 rounded-xl p-6 relative overflow-hidden shadow-2xl space-y-5 select-none"
    >
      {/* Header Panel */}
      <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-slate-900">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white m-0 font-heading">
                3D von Mises Stress Heatmap & Flow Model
              </h3>
              <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-950/40 border border-purple-800/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Sync View
              </span>
            </div>
            <p className="text-xs text-slate-400 m-0 mt-0.5">
              Drag models to orbit &bull; Synchronized multi-pass geometric stress visualizer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setCompareMode(false)}
              className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition cursor-pointer ${
                !compareMode ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Single
            </button>
            <button
              onClick={() => setCompareMode(true)}
              className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition cursor-pointer ${
                compareMode ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Compare
            </button>
          </div>

          <button
            onClick={handleTakeSnapshot}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition shadow-sm cursor-pointer"
            title="Download PNG Snapshot of current 3D views"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Snapshot</span>
          </button>
        </div>
      </div>

      {/* Selectors depending on compare mode */}
      {!compareMode ? (
        <div className="flex items-center gap-0.5 w-full">
          {passes.map((p, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedPassIdx(idx)}
              className={`flex-1 h-8 text-[10px] font-mono font-bold rounded transition cursor-pointer ${
                idx === selectedPassIdx
                  ? 'bg-purple-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              P{p.pass}
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-2.5 rounded-xl border border-slate-900/60 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold uppercase tracking-wider">Pass Left:</span>
            <select
              value={comparePassIdxA}
              onChange={(e) => setComparePassIdxA(parseInt(e.target.value))}
              className="bg-slate-900 text-white text-xs font-mono border border-slate-800 rounded px-2.5 py-1 focus:outline-none focus:border-purple-500 cursor-pointer"
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
              className="bg-slate-900 text-white text-xs font-mono border border-slate-800 rounded px-2.5 py-1 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              {passes.map((p, idx) => (
                <option key={idx} value={idx}>Pass #{p.pass} ({p.toDie.toFixed(2)} mm)</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Die Angle & Taper Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/80 p-3.5 rounded-xl border border-slate-900 text-xs font-mono">
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

      {/* Main Viewport Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Render area */}
        <div
          ref={mainContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
          className="lg:col-span-8 bg-slate-950/90 border border-slate-900 rounded-xl relative overflow-hidden shadow-inner p-2 min-h-[360px] flex items-stretch"
        >
          {!compareMode ? (
            <div className="w-full relative h-full flex flex-col justify-between">
              <PassVisualizerCanvas
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
              
              {/* Tooltip single */}
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full">
              {/* Left Canvas */}
              <div className="relative border-r border-slate-900/60 pr-1 flex flex-col justify-between">
                <div className="absolute top-2 left-2 z-10 text-[9px] font-mono bg-purple-950/70 border border-purple-800/40 text-purple-400 font-bold px-2 py-0.5 rounded">
                  PASS #{activePassA.pass}
                </div>
                <PassVisualizerCanvas
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
                
                {hoverInfoA && (
                  <div
                    className="pointer-events-none absolute z-50 bg-slate-900/95 border border-slate-700 rounded-lg px-3 py-2 text-[10px] font-mono shadow-xl"
                    style={{
                      left: hoverInfoA.x - (mainContainerRef.current?.getBoundingClientRect().left ?? 0) + 12,
                      top: hoverInfoA.y - (mainContainerRef.current?.getBoundingClientRect().top ?? 0) - 8,
                    }}
                  >
                    <div className="text-slate-300 font-bold mb-1">Axial: {hoverInfoA.axial.toFixed(1)} mm</div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-pink-500 inline-block" />
                      <span className="text-pink-400">{hoverInfoA.stress.toFixed(0)} MPa</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Thermometer className="w-2.5 h-2.5 text-amber-400" />
                      <span className="text-amber-400">{hoverInfoA.temp.toFixed(1)} &deg;C</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Canvas */}
              <div className="relative flex flex-col justify-between pl-1">
                <div className="absolute top-2 left-2 z-10 text-[9px] font-mono bg-emerald-950/70 border border-emerald-800/40 text-emerald-400 font-bold px-2 py-0.5 rounded">
                  PASS #{activePassB.pass}
                </div>
                <PassVisualizerCanvas
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

                {hoverInfoB && (
                  <div
                    className="pointer-events-none absolute z-50 bg-slate-900/95 border border-slate-700 rounded-lg px-3 py-2 text-[10px] font-mono shadow-xl"
                    style={{
                      left: hoverInfoB.x - (mainContainerRef.current?.getBoundingClientRect().left ?? 0) + 12,
                      top: hoverInfoB.y - (mainContainerRef.current?.getBoundingClientRect().top ?? 0) - 8,
                    }}
                  >
                    <div className="text-slate-300 font-bold mb-1">Axial: {hoverInfoB.axial.toFixed(1)} mm</div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-pink-500 inline-block" />
                      <span className="text-pink-400">{hoverInfoB.stress.toFixed(0)} MPa</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Thermometer className="w-2.5 h-2.5 text-amber-400" />
                      <span className="text-amber-400">{hoverInfoB.temp.toFixed(1)} &deg;C</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Viewport Play/Pause/Reset Controls */}
          <div className="absolute top-3 left-3 flex items-center space-x-2 z-20">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800/80 transition"
              title={isPlaying ? 'Pause Flow animation' : 'Start Flow animation'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              onClick={() => {
                setRotationX(20);
                setRotationY(-35);
                setZoom(1.0);
                setApproachAngle2Alpha(14);
                setBearingLengthLbRatio(35);
                setSliceAngleDeg(270);
              }}
              className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800/80 transition"
              title="Reset view angles"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Render Mode Switcher */}
          <div className="absolute top-3 right-3 flex items-center space-x-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800/80 z-20">
            {([
              { id: 'heatmap' as const, label: 'Stress' },
              { id: 'wireframe' as const, label: 'Wireframe' },
              { id: 'shear' as const, label: 'Shear' },
            ]).map((m) => (
              <button
                key={m.id}
                onClick={() => setRenderMode(m.id)}
                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition cursor-pointer ${
                  renderMode === m.id
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Legend range indicator */}
          <div className="absolute bottom-3 left-3 right-3 bg-slate-900/85 backdrop-blur border border-slate-800/80 px-4 py-2 rounded-xl flex items-center justify-between text-[10px] font-mono z-20">
            <span className="text-slate-400 uppercase font-bold text-[9px]">Stress Limits:</span>
            <div className="flex items-center space-x-2">
              <span className="text-blue-400">0 MPa</span>
              <div className="w-28 h-2 rounded-full border border-slate-700 flex overflow-hidden">
                <div className="flex-1 bg-blue-500" />
                <div className="flex-1 bg-emerald-500" />
                <div className="flex-1 bg-amber-500" />
                <div className="flex-1 bg-red-500" />
                <div className="flex-1 bg-pink-500" />
              </div>
              <span className="text-pink-400 font-bold">{(maxStress).toFixed(0)} MPa</span>
            </div>
          </div>
        </div>

        {/* Selected Pass Mechanics Sidebar / Comparison Metrics */}
        <div className="lg:col-span-4 bg-slate-950/90 border border-slate-900 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-900">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider m-0 font-heading">
              {!compareMode ? `Pass #${activePassSingle.pass} Physics` : 'Pass A vs Pass B Specs'}
            </h4>
            <span className="text-[10px] font-mono text-purple-400 font-bold bg-purple-950/40 px-2 py-0.5 rounded border border-purple-900/30 uppercase tracking-wide">
              {!compareMode ? 'Metrics' : 'Delta Analysis'}
            </span>
          </div>

          {!compareMode ? (
            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex justify-between p-2 bg-slate-900/40 rounded border border-slate-900">
                <span className="text-slate-400">Inlet Diameter:</span>
                <span className="text-blue-400 font-bold">{(din).toFixed(3)} mm</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-900/40 rounded border border-slate-900">
                <span className="text-slate-400">Outlet Diameter:</span>
                <span className="text-emerald-400 font-bold">{(dout).toFixed(3)} mm</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-900/40 rounded border border-slate-900">
                <span className="text-slate-400">Area Reduction:</span>
                <span className="text-emerald-400 font-bold">{(areaRed).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-900/40 rounded border border-slate-900">
                <span className="text-slate-400">Delta Parameter (&Delta;):</span>
                <span className={`font-bold ${deltaParam > 3.0 ? 'text-rose-400' : 'text-cyan-400'}`}>
                  {deltaParam.toFixed(2)}
                </span>
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
                      <td className="py-1.5 font-bold">Delta (&Delta;)</td>
                      <td className="py-1.5">{(activePassA.approachAngle2Alpha * Math.PI / 180 / Math.max(0.01, activePassA.areaReduction / 100)).toFixed(2)}</td>
                      <td className="py-1.5">{(activePassB.approachAngle2Alpha * Math.PI / 180 / Math.max(0.01, activePassB.areaReduction / 100)).toFixed(2)}</td>
                      <td className="py-1.5 text-right font-bold">{calculateDelta(
                        activePassA.approachAngle2Alpha * Math.PI / 180 / Math.max(0.01, activePassA.areaReduction / 100),
                        activePassB.approachAngle2Alpha * Math.PI / 180 / Math.max(0.01, activePassB.areaReduction / 100)
                      )}</td>
                    </tr>
                    <tr className="border-b border-slate-900/40">
                      <td className="py-1.5 font-bold">Stress (MPa)</td>
                      <td className="py-1.5">{(activePassA.drawingStress ?? 0).toFixed(0)}</td>
                      <td className="py-1.5">{(activePassB.drawingStress ?? 0).toFixed(0)}</td>
                      <td className="py-1.5 text-right font-bold text-purple-400">{calculateDelta(activePassA.drawingStress ?? 0, activePassB.drawingStress ?? 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Stress Warning Alert */}
          {isCentralBurstRisk ? (
            <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <strong className="block text-rose-200 font-bold uppercase text-[10px] tracking-wider mb-0.5">
                  Central Burst Risk Zone (&Delta; = {deltaParam.toFixed(2)})
                </strong>
                <p className="m-0 text-[11px] leading-snug">
                  High Delta parameter detected! Glowing internal 3D chevron cracks rendered in core. Reduce approach angle 2&alpha; or increase reduction.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-emerald-300 text-xs flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-emerald-200 font-bold uppercase text-[10px] tracking-wider mb-0.5">
                  Optimal Geometry Zone
                </strong>
                <p className="m-0 text-[11px] leading-snug">
                  Die angle 2&alpha;={approachAngle2Alpha}&deg; and reduction {areaRed.toFixed(1)}% yield safe internal shear stress boundaries.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
