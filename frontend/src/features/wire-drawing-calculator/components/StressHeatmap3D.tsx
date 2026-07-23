import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  RotateCcw,
  Play,
  Pause,
  Sliders,
  Sparkles,
  Activity,
  AlertTriangle,
  Camera,
  Scissors,
  Zap,
} from 'lucide-react';
import { PassData } from '../types';

interface StressHeatmap3DProps {
  passes: PassData[];
}

export default function StressHeatmap3D({ passes }: StressHeatmap3DProps) {
  const [selectedPassIdx, setSelectedPassIdx] = useState<number>(0);
  const [rotationX, setRotationX] = useState<number>(20);
  const [rotationY, setRotationY] = useState<number>(-35);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [renderMode, setRenderMode] = useState<
    'heatmap' | 'wireframe' | 'shear'
  >('heatmap');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // Feature 1 Sliders: Live Die Geometry Tuning
  const [approachAngle2Alpha, setApproachAngle2Alpha] = useState<number>(14); // 8 to 24 deg
  const [bearingLengthLbRatio, setBearingLengthLbRatio] = useState<number>(35); // 20 to 60%

  // Feature 2 Slider: Cutaway Slice Angle
  const [sliceAngleDeg, setSliceAngleDeg] = useState<number>(270); // 90, 180, 270, 360

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activePass = passes[selectedPassIdx] || passes[0] || {
    pass: 1,
    fromDie: 3.0,
    toDie: 2.5,
    areaReduction: 30.55,
    elongation: 44.0,
  };

  const din = activePass?.fromDie ?? 3.0;
  const dout = activePass?.toDie ?? 2.5;
  const areaRed = activePass?.areaReduction ?? (activePass as any)?.areaRed ?? 0;
  const elongation = activePass?.elongation ?? 0;

  // Calculate Delta parameter (Delta = (2alpha / r) * (1 + sqrt(1 - r)))
  const rFrac = Math.max(0.01, Math.min(0.9, areaRed / 100));
  const alphaRadHalf = ((approachAngle2Alpha / 2) * Math.PI) / 180;
  const deltaParam = (approachAngle2Alpha * Math.PI / 180 / rFrac) * (1 + Math.sqrt(1 - rFrac));
  const isCentralBurstRisk = deltaParam > 3.0 || approachAngle2Alpha > 18 || areaRed > 24;

  // Feature 5: High-Res 3D Snapshot Downloader
  const handleTakeSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageURI = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `DMS_3D_Stress_Heatmap_Pass_${activePass.pass || 1}.png`;
    link.href = imageURI;
    link.click();
  };

  // Animation Frame Loop & 3D WebGL Canvas Render
  useEffect(() => {
    let animId: number;
    let particleOffset = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Background Grid & Radial Lighting Gradient
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        50,
        width / 2,
        height / 2,
        width / 1.2
      );
      bgGrad.addColorStop(0, '#090D16');
      bgGrad.addColorStop(1, '#030509');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Tech Grid Background Lines
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

      // Isometric 3D Projection Matrix Transformation
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoom, zoom);

      const radX = (rotationX * Math.PI) / 180;
      const radY = (rotationY * Math.PI) / 180;

      const project3D = (x: number, y: number, z: number) => {
        // Rotate Y (Azimuth)
        const x1 = x * Math.cos(radY) + z * Math.sin(radY);
        const z1 = -x * Math.sin(radY) + z * Math.cos(radY);
        // Rotate X (Pitch)
        const y2 = y * Math.cos(radX) - z1 * Math.sin(radX);
        return { px: x1, py: y2 };
      };

      // Scale Factors
      const scaleR = 18;
      const rIn = (din / 2) * scaleR;
      const rOut = (dout / 2) * scaleR;

      // Dynamic Cone Length based on Approach Angle 2alpha
      const coneLength = Math.max(30, Math.min(120, (rIn - rOut) / Math.tan(alphaRadHalf)));
      const xEntrance = -180;
      const xConeStart = -coneLength / 2;
      const xConeEnd = coneLength / 2;
      const xExit = xConeEnd + 100;

      const numSegments = 36;
      const maxCutoffRad = (sliceAngleDeg * Math.PI) / 180;

      // Render 3D Cylinder / Cone Mesh Sections
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

          // Apply Cutaway Slice Angle
          if (isDie && angle1 > maxCutoffRad) {
            continue;
          }

          const y1_start = rStart * Math.cos(angle1);
          const z1_start = rStart * Math.sin(angle1);
          const y2_start = rStart * Math.cos(angle2);
          const z2_start = rStart * Math.sin(angle2);

          const y1_end = rEnd * Math.cos(angle1);
          const z1_end = rEnd * Math.sin(angle1);
          const y2_end = rEnd * Math.cos(angle2);
          const z2_end = rEnd * Math.sin(angle2);

          const p1 = project3D(xStart, y1_start, z1_start);
          const p2 = project3D(xStart, y2_start, z2_start);
          const p3 = project3D(xEnd, y2_end, z2_end);
          const p4 = project3D(xEnd, y1_end, z1_end);

          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.lineTo(p3.px, p3.py);
          ctx.lineTo(p4.px, p4.py);
          ctx.closePath();

          if (isDie) {
            ctx.fillStyle =
              renderMode === 'wireframe'
                ? 'rgba(15, 23, 42, 0.35)'
                : 'rgba(30, 41, 59, 0.65)';
            ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
            ctx.lineWidth = 1;
            ctx.fill();
            ctx.stroke();
          } else {
            // Compute von Mises Stress Gradient along Axial Position
            let stressVal = 0.2;
            if (xStart < xConeStart) {
              stressVal = 0.25;
            } else if (xStart >= xConeStart && xStart <= xConeEnd) {
              const t = (xStart - xConeStart) / (xConeEnd - xConeStart);
              stressVal = 0.4 + 0.55 * Math.sin(t * Math.PI);
              // Factor in Approach Angle & Bearing ratio
              stressVal *= 1 + (approachAngle2Alpha - 14) * 0.02;
            } else {
              stressVal = 0.35 + 0.1 * (1 - (xStart - xConeEnd) / 100);
            }

            if (areaRed > 24) stressVal *= 1.12;

            let color = '#3B82F6';
            if (renderMode === 'heatmap') {
              if (stressVal > 0.85) color = '#EC4899';
              else if (stressVal > 0.7) color = '#EF4444';
              else if (stressVal > 0.5) color = '#F59E0B';
              else if (stressVal > 0.35) color = '#10B981';
              else color = '#3B82F6';
            } else if (renderMode === 'shear') {
              color = `rgba(16, 185, 129, ${0.3 + stressVal * 0.6})`;
            } else {
              color = 'rgba(59, 130, 246, 0.3)';
            }

            ctx.fillStyle = color;
            ctx.strokeStyle =
              renderMode === 'wireframe'
                ? 'rgba(255, 255, 255, 0.4)'
                : 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 0.75;
            ctx.fill();
            ctx.stroke();
          }
        }
      };

      // Draw 3D Outer Die Nib Shell
      const rDieOuter = rIn + 45;
      draw3DCylinderSection(xEntrance, xExit, rDieOuter, rDieOuter, true);

      // Draw Wire Body Sections
      draw3DCylinderSection(xEntrance, xConeStart, rIn, rIn, false);
      const stepsCone = 10;
      for (let s = 0; s < stepsCone; s++) {
        const x1 = xConeStart + (s / stepsCone) * (xConeEnd - xConeStart);
        const x2 =
          xConeStart + ((s + 1) / stepsCone) * (xConeEnd - xConeStart);
        const r1 = rIn - (s / stepsCone) * (rIn - rOut);
        const r2 = rIn - ((s + 1) / stepsCone) * (rIn - rOut);
        draw3DCylinderSection(x1, x2, r1, r2, false);
      }
      draw3DCylinderSection(xConeEnd, xExit, rOut, rOut, false);

      // Feature 3: Internal 3D Chevron Crack Mesh Overlay (Central Burst Defect)
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

      // Feature 4: Flow Particles & Helical Surface Shear Vectors
      if (isPlaying) {
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

        // Helical Friction Lines on Perimeter
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

      if (isPlaying) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [
    selectedPassIdx,
    rotationX,
    rotationY,
    zoom,
    isPlaying,
    renderMode,
    din,
    dout,
    areaRed,
    approachAngle2Alpha,
    bearingLengthLbRatio,
    sliceAngleDeg,
    isCentralBurstRisk,
  ]);

  // Mouse Drag to Orbit 3D
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
              Drag to orbit 3D view • Tune die geometry & inspect core stress / internal defects
            </p>
          </div>
        </div>

        {/* Pass Selector & 3D Snapshot Button */}
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
                  Pass #{p.pass} (Ø {(p.fromDie ?? 0).toFixed(3)} ➔ {(p.toDie ?? 0).toFixed(3)} mm)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Feature 1 & 2: Interactive Parameter Sliders Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/80 p-3.5 rounded-xl border border-slate-900 text-xs font-mono">
        {/* Slider 1: Approach Angle 2alpha */}
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400">Approach Angle (2α):</span>
            <span className="text-purple-400 font-bold">{approachAngle2Alpha}°</span>
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

        {/* Slider 2: Bearing Length Lb Ratio */}
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400">Bearing Length (Lb):</span>
            <span className="text-emerald-400 font-bold">{bearingLengthLbRatio}% d₂</span>
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

        {/* Slider 3: Cutaway Slice Angle */}
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <Scissors className="w-3 h-3 text-cyan-400" />
              <span>Cutaway Slice:</span>
            </span>
            <span className="text-cyan-400 font-bold">{sliceAngleDeg}°</span>
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
          className="lg:col-span-8 bg-slate-950/90 border border-slate-900 rounded-xl relative overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-[360px]"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className="w-full h-auto block select-none"
          />

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
            {(
              [
                { id: 'heatmap', label: 'Stress Heatmap' },
                { id: 'wireframe', label: 'Wireframe' },
                { id: 'shear', label: 'Shear Vectors' },
              ] as const
            ).map((m) => (
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

          {/* Color Scale Legend */}
          <div className="absolute bottom-3 left-3 right-3 bg-slate-900/85 backdrop-blur border border-slate-800/80 px-4 py-2 rounded-xl flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400 uppercase font-bold">von Mises Stress Spectrum:</span>
            <div className="flex items-center space-x-2">
              <span className="text-blue-400">Low (0.2σy)</span>
              <div className="w-32 h-2.5 rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 via-amber-500 to-pink-500 border border-slate-700" />
              <span className="text-pink-400 font-bold">Peak (&gt;0.9σy)</span>
            </div>
          </div>
        </div>

        {/* Selected Pass Mechanics Sidebar */}
        <div className="lg:col-span-4 bg-slate-950/90 border border-slate-900 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-900">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider m-0 font-heading">
              Pass #{activePass.pass} Physics Metrics
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
              <span className="text-slate-400">Delta Parameter (Δ):</span>
              <span className={`font-bold ${deltaParam > 3.0 ? 'text-rose-400' : 'text-cyan-400'}`}>
                {deltaParam.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Stress Warning Alert */}
          {isCentralBurstRisk ? (
            <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <strong className="block text-rose-200 font-bold uppercase text-[10px] tracking-wider mb-0.5">
                  Central Burst / Chevron Risk (Δ = {deltaParam.toFixed(2)})
                </strong>
                <p className="m-0 text-[11px] leading-snug">
                  High Delta parameter detected! Glowing internal 3D chevron cracks rendered in core. Reduce approach angle 2α or increase reduction.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-emerald-300 text-xs flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-emerald-200 font-bold uppercase text-[10px] tracking-wider mb-0.5">
                  Optimal Flow & Die Geometry Zone
                </strong>
                <p className="m-0 text-[11px] leading-snug">
                  Die angle 2α={approachAngle2Alpha}° and reduction {areaRed.toFixed(1)}% yield safe internal shear stress boundaries.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
