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

export default function StressHeatmap3D({ passes }: StressHeatmap3DProps) {
  const [selectedPassIdx, setSelectedPassIdx] = useState<number>(0);
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

  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number }>({ w: 640, h: 360 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isActuallyPlayingRef = useRef(true);
  const stressRangeRef = useRef<{ min: number; max: number }>({ min: 0, max: 1 });
  const touchStartDist = useRef<number>(0);
  const touchStartZoom = useRef<number>(1);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDisplaySize({ w: Math.max(320, Math.floor(width)), h: Math.max(240, Math.floor(height)) });
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
  }, [displaySize]);

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
    if (isPlaying) {
      isActuallyPlayingRef.current = true;
    }
  }, [isPlaying]);

  const activePass = passes[selectedPassIdx] || passes[0];

  const din = activePass?.fromDie ?? 3.0;

  const dout = activePass?.toDie ?? 2.5;
  const areaRed = activePass?.areaReduction ?? 0;
  const elongation = activePass?.elongation ?? 0;

  const rFrac = Math.max(0.01, Math.min(0.9, areaRed / 100));
  const alphaRadHalf = ((approachAngle2Alpha / 2) * Math.PI) / 180;
  const deltaParam = (approachAngle2Alpha * Math.PI / 180 / rFrac) * (1 + Math.sqrt(1 - rFrac));
  const isCentralBurstRisk = deltaParam > 3.0 || approachAngle2Alpha > 18 || areaRed > 24;

  const K = 315;
  const nPow = 0.54;
  const mu = 0.04;
  const epsilon = Math.log(1 / (1 - rFrac));
  const sigmaFlow = K * Math.pow(Math.max(epsilon, 0.001), nPow) / (nPow + 1);
  const phi = 0.88 + 0.12 * ((alphaRadHalf * 2) / rFrac) * (1 - rFrac);
  const sigmaD = sigmaFlow * phi * epsilon * (1 + mu / Math.tan(Math.max(alphaRadHalf, 0.01)));
  const maxStress = sigmaFlow * 2.5;
  const deltaT = (sigmaD * epsilon) / (8960 * 385) * 1e6;

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

  const handleTakeSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageURI = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `DMS_3D_Stress_Heatmap_Pass_${activePass?.pass || 1}.png`;
    link.href = imageURI;
    link.click();
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDist.current = Math.sqrt(dx * dx + dy * dy);
      touchStartZoom.current = zoom;
    }
  }, [zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      const deltaX = e.touches[0].clientX - dragStart.x;
      const deltaY = e.touches[0].clientY - dragStart.y;
      setRotationY((prev) => prev + deltaX * 0.5);
      setRotationX((prev) => Math.max(-80, Math.min(80, prev - deltaY * 0.5)));
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2 && touchStartDist.current > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / touchStartDist.current;
      setZoom(Math.max(0.3, Math.min(3, touchStartZoom.current * scale)));
    }
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(false);
    touchStartDist.current = 0;
  }, []);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setRotationY((prev) => prev + deltaX * 0.5);
      setRotationX((prev) => Math.max(-80, Math.min(80, prev - deltaY * 0.5)));
      setDragStart({ x: e.clientX, y: e.clientY });
      setHoverInfo(null);
      return;
    }

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

    setHoverInfo({
      x: e.clientX,
      y: e.clientY,
      axial: axialMm,
      stress: stressMPa,
      temp: 25 + localDeltaT,
      strain: axialPos >= xConeStart && axialPos <= xConeEnd
        ? Math.max(0, Math.min(1, (axialPos - xConeStart) / (xConeEnd - xConeStart))) * epsilon
        : axialPos > xConeEnd ? epsilon : 0,
    });
  }, [isDragging, dragStart, sigmaD, epsilon, xConeStart, xConeEnd, xBearEnd, bearingLen]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setHoverInfo(null);
  }, []);

  useEffect(() => {
    let animId: number;
    let particleOffset = 0;
    let localMin = Infinity;
    let localMax = -Infinity;

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

      localMin = Infinity;
      localMax = -Infinity;

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
            if (stressVal < localMin) localMin = stressVal;
            if (stressVal > localMax) localMax = stressVal;

            // IMPROVEMENT 1 & 10: Bearing land gets distinct amber coloring
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

      // Wire: entrance to cone start
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

      // IMPROVEMENT 1 & 10: Bearing land (cylindrical section after cone)
      if (bearingLen > 1) {
        draw3DCylinderSection(xConeEnd, xBearEnd, rOut, rOut, false);
      }

      // Exit wire after bearing
      draw3DCylinderSection(xBearEnd, xExit, rOut, rOut, false);

      // Central burst chevron cracks
      if (isCentralBurstRisk) {
        ctx.strokeStyle = '#EC4899';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#EC4899';
        ctx.shadowBlur = 10;

        for (let cx = xConeStart + 10; cx <= xConeEnd; cx += 25) {
          const pCenter = project3D(cx, 0, 0);
          const pTop = project3D(cx - 15, -12, 0);
          const pBot = project3D(cx - 15, 12, 0);

          ctx.beginPath();
          ctx.moveTo(pTop.px, pTop.py);
          ctx.lineTo(pCenter.px, pCenter.py);
          ctx.lineTo(pBot.px, pBot.py);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }

      // Flow particles
      if (isActuallyPlayingRef.current) {
        particleOffset = (particleOffset + 1.8) % 40;
      }

      ctx.fillStyle = '#FFFFFF';
      for (let px = xEntrance + particleOffset; px < xExit; px += 40) {
        let currentR = rIn;
        if (px >= xConeStart && px <= xConeEnd) {
          const t = (px - xConeStart) / (xConeEnd - xConeStart);
          currentR = rIn - t * (rIn - rOut);
        } else if (px > xConeEnd) {
          currentR = rOut;
        }

        const p = project3D(px, 0, 0);
        ctx.beginPath();
        ctx.arc(p.px, p.py, 2.5, 0, Math.PI * 2);
        ctx.fill();

        if (renderMode === 'shear') {
          const pPerim1 = project3D(px, currentR, 0);
          const pPerim2 = project3D(px + 10, currentR * 0.9, 10);
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pPerim1.px, pPerim1.py);
          ctx.lineTo(pPerim2.px, pPerim2.py);
          ctx.stroke();
        }
      }

      ctx.restore();

      // Update legend range
      stressRangeRef.current = {
        min: localMin === Infinity ? 0 : localMin,
        max: localMax === -Infinity ? 1 : localMax,
      };

      if (isActuallyPlayingRef.current) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [
    selectedPassIdx, rotationX, rotationY, zoom, isPlaying, renderMode,
    din, dout, areaRed, approachAngle2Alpha, bearingLengthLbRatio, sliceAngleDeg,
    isCentralBurstRisk, displaySize, sigmaD, maxStress, bearingLen,
    xConeStart, xConeEnd, xBearEnd, xExit, xEntrance,
    coneLength, rIn, rOut, alphaRadHalf,
  ]);

  if (!passes || passes.length === 0) {
    return (
      <div className="wdc-panel bg-[#050913]/90 border border-slate-900 rounded-xl p-12 text-center">
        <Activity className="h-8 w-8 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">No pass data available. Generate a die schedule to view the 3D stress model.</p>
      </div>
    );
  }

  const stressMin = stressRangeRef.current.min;
  const stressMax = stressRangeRef.current.max;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="wdc-panel bg-[#050913]/90 border border-slate-900 rounded-xl p-6 relative overflow-hidden shadow-2xl space-y-5"
    >
      {/* Header & Controls */}
      <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-slate-900">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white m-0 font-heading">
                3D von Mises Stress Heatmap & Flow Model
              </h3>
              <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-950/40 border border-purple-800/40 px-2 py-0.5 rounded-full uppercase">
                3D WebGL Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 m-0 mt-0.5">
              Drag to orbit 3D view &bull; Tune die geometry &amp; inspect core stress / internal defects
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleTakeSnapshot}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition shadow-sm cursor-pointer"
            title="Download High-Res 3D Blueprint Snapshot"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>3D Snapshot</span>
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-slate-400">Pass:</span>
            <select
              value={selectedPassIdx}
              onChange={(e) => setSelectedPassIdx(parseInt(e.target.value))}
              className="bg-slate-900 text-white text-xs font-mono font-bold border border-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              {passes.map((p, idx) => (
                <option key={idx} value={idx}>
                  Pass #{p.pass} (&oslash; {(p.fromDie ?? 0).toFixed(3)} &rarr; {(p.toDie ?? 0).toFixed(3)} mm)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* IMPROVEMENT 9: Pass sequence timeline */}
      <div className="flex items-center gap-0.5 w-full">
        {passes.map((p, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedPassIdx(idx)}
            className={`flex-1 h-8 text-[10px] font-mono font-bold rounded transition cursor-pointer ${
              idx === selectedPassIdx
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            P{p.pass}
          </button>
        ))}
      </div>

      {/* Parameter Sliders Toolbar */}
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

      {/* Main Viewport Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 3D Render Canvas */}
        <div
          ref={containerRef}
          className="lg:col-span-8 bg-slate-950/90 border border-slate-900 rounded-xl relative overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-[360px]"
          onMouseDown={(e) => { setIsDragging(true); setDragStart({ x: e.clientX, y: e.clientY }); }}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-auto block select-none"
          />

          {/* IMPROVEMENT 8: Hover tooltip */}
          {hoverInfo && (
            <div
              className="pointer-events-none absolute z-50 bg-slate-900/95 border border-slate-700 rounded-lg px-3 py-2 text-[10px] font-mono shadow-xl"
              style={{
                left: hoverInfo.x - (containerRef.current?.getBoundingClientRect().left ?? 0) + 12,
                top: hoverInfo.y - (containerRef.current?.getBoundingClientRect().top ?? 0) - 8,
              }}
            >
              <div className="text-slate-300 font-bold mb-1">Axial: {hoverInfo.axial.toFixed(1)} mm</div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-pink-500 inline-block" />
                <span className="text-pink-400">{hoverInfo.stress.toFixed(0)} MPa</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Thermometer className="w-2.5 h-2.5 text-amber-400" />
                <span className="text-amber-400">{hoverInfo.temp.toFixed(1)} &deg;C</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Strain:</span>
                <span className="text-cyan-400">{hoverInfo.strain.toFixed(3)}</span>
              </div>
            </div>
          )}

          {/* Viewport Overlay Controls */}
          <div className="absolute top-3 left-3 flex items-center space-x-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
              title={isPlaying ? 'Pause Flow' : 'Play Flow'}
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
              className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
              title="Reset 3D View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Render Mode Switcher */}
          <div className="absolute top-3 right-3 flex items-center space-x-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
            {([
              { id: 'heatmap' as const, label: 'Stress Heatmap' },
              { id: 'wireframe' as const, label: 'Wireframe' },
              { id: 'shear' as const, label: 'Shear Vectors' },
            ]).map((m) => (
              <button
                key={m.id}
                onClick={() => setRenderMode(m.id)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                  renderMode === m.id
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* IMPROVEMENT 3: Dynamic stress legend with 5-step gradient */}
          <div className="absolute bottom-3 left-3 right-3 bg-slate-900/85 backdrop-blur border border-slate-800/80 px-4 py-2 rounded-xl flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400 uppercase font-bold">von Mises Stress:</span>
            <div className="flex items-center space-x-2">
              <span className="text-blue-400">{(stressMin * maxStress).toFixed(0)} MPa</span>
              <div className="w-40 h-2.5 rounded-full border border-slate-700 flex overflow-hidden">
                <div className="flex-1 bg-blue-500" />
                <div className="flex-1 bg-emerald-500" />
                <div className="flex-1 bg-amber-500" />
                <div className="flex-1 bg-red-500" />
                <div className="flex-1 bg-pink-500" />
              </div>
              <span className="text-pink-400 font-bold">{(stressMax * maxStress).toFixed(0)} MPa</span>
            </div>
          </div>
        </div>

        {/* Selected Pass Mechanics Sidebar */}
        <div className="lg:col-span-4 bg-slate-950/90 border border-slate-900 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-900">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider m-0 font-heading">
              Pass #{activePass?.pass} Physics Metrics
            </h4>
            <span className="text-[10px] font-mono text-purple-400 font-bold bg-purple-950/40 px-2 py-0.5 rounded border border-purple-900/30">
              Active Draft
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between p-2.5 bg-slate-900/40 rounded-lg border border-slate-800/60">
              <span className="text-slate-400">Inlet Diameter:</span>
              <span className="text-blue-400 font-bold">{(din ?? 0).toFixed(3)} mm</span>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-900/40 rounded-lg border border-slate-800/60">
              <span className="text-slate-400">Outlet Diameter:</span>
              <span className="text-emerald-400 font-bold">{(dout ?? 0).toFixed(3)} mm</span>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-900/40 rounded-lg border border-slate-800/60">
              <span className="text-slate-400">Area Reduction:</span>
              <span className="text-emerald-400 font-bold">{(areaRed ?? 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-900/40 rounded-lg border border-slate-800/60">
              <span className="text-slate-400">Elongation Growth:</span>
              <span className="text-amber-400 font-bold">+{(elongation ?? 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-900/40 rounded-lg border border-slate-800/60">
              <span className="text-slate-400">Delta Parameter (&Delta;):</span>
              <span className={`font-bold ${deltaParam > 3.0 ? 'text-rose-400' : 'text-cyan-400'}`}>
                {deltaParam.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-900/40 rounded-lg border border-slate-800/60">
              <span className="text-slate-400">Drawing Stress (&sigma;<sub>d</sub>):</span>
              <span className="text-purple-400 font-bold">{sigmaD.toFixed(0)} MPa</span>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-900/40 rounded-lg border border-slate-800/60">
              <span className="text-slate-400">Temp Rise (&Delta;T):</span>
              <span className="text-amber-400 font-bold">+{deltaT.toFixed(1)} &deg;C</span>
            </div>
          </div>

          {/* Stress Warning Alert */}
          {isCentralBurstRisk ? (
            <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <strong className="block text-rose-200 font-bold uppercase text-[10px] tracking-wider mb-0.5">
                  Central Burst / Chevron Risk (&Delta; = {deltaParam.toFixed(2)})
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
                  Optimal Flow &amp; Die Geometry Zone
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
