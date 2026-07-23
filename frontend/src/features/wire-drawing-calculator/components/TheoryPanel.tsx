import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Info,
  ChevronDown,
  ChevronUp,
  Cpu,
  Activity,
  Lightbulb,
  Sliders,
  Layers,
  Scale,
  Zap,
  Target,
  ShieldAlert,
} from 'lucide-react';

type TabType = 'cad' | 'simulator' | 'formulas' | 'tradeoffs';

interface DieZoneInfo {
  id: string;
  name: string;
  angleOrSpec: string;
  purpose: string;
  misconfigRisk: string;
  color: string;
  bgColor: string;
}

const DIE_ZONES: Record<string, DieZoneInfo> = {
  entrance: {
    id: 'entrance',
    name: 'Entrance Bell & Lubrication Zone',
    angleOrSpec: '30° - 60° Open Bell Angle',
    purpose: 'Funnels the wire smoothly into the die and traps lubricant (soap powder or oil) under high hydrodynamic pressure to form a continuous boundary lubrication film.',
    misconfigRisk: 'Too narrow: lubricant starves, causing metal-to-metal galling and die scratching. Too steep: lubricant escapes or wire scrapes against edge.',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
  },
  approach: {
    id: 'approach',
    name: 'Approach Angle / Reduction Cone (2α)',
    angleOrSpec: '10° - 18° Included Angle (2α)',
    purpose: 'The primary plastic deformation zone where the wire diameter is reduced. Compressive yield stress forces the metal to flow axially into a smaller cross-section.',
    misconfigRisk: 'Too large (steep): causes high redundant shear work and "cup & cone" central burst internal fracturing. Too small (shallow): increases wire-to-die contact length, causing excessive friction, heat, and die wear.',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
  },
  bearing: {
    id: 'bearing',
    name: 'Bearing Land (Lb)',
    angleOrSpec: '30% - 50% of Wire Diameter (0.3d - 0.5d)',
    purpose: 'Parallel cylindrical section that stabilizes wire size, ensures roundness, controls final surface finish, and resists rapid die wear.',
    misconfigRisk: 'Too long: generates intense friction heat, increases drawing force, and causes heat-treat softening. Too short: rapid die wear causes size drift and ovality.',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
  },
  exit: {
    id: 'exit',
    name: 'Back Relief / Exit Cone (γ)',
    angleOrSpec: '7° - 12° Relief Angle (γ)',
    purpose: 'Provides clearance as the wire exits the bearing, preventing back-chipping of the tungsten carbide or PCD nib and accommodating elastic springback.',
    misconfigRisk: 'Missing/shallow exit relief causes carbide chipping, wire scratching, and burr formation during minor wire alignment shifts.',
    color: '#EC4899',
    bgColor: 'rgba(236, 72, 153, 0.15)',
  },
};

export default function TheoryPanel() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('cad');
  const [selectedZone, setSelectedZone] = useState<string>('approach');

  // Simulator State
  const [simDin, setSimDin] = useState<number>(3.0);
  const [simDout, setSimDout] = useState<number>(2.5);

  // Math Calculations for Simulator
  const areaIn = (Math.PI * Math.pow(simDin, 2)) / 4;
  const areaOut = (Math.PI * Math.pow(simDout, 2)) / 4;
  const areaRed = ((areaIn - areaOut) / areaIn) * 100;
  const elongation = ((areaIn / areaOut) - 1) * 100;
  const speedRatio = areaIn / areaOut;
  const trueStrain = Math.log(areaIn / areaOut);
  // Estimate stress ratio using Siebel equation (simplified: ln(A0/A1) + 2/3 * alpha)
  const alphaRad = (12 * Math.PI) / 360; // 12 deg
  const drawStressRatio = trueStrain + (2 / 3) * alphaRad + 0.05 * (0.4);

  const activeZoneInfo = DIE_ZONES[selectedZone] || DIE_ZONES['approach'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="wdc-panel bg-[#050913]/90 border border-slate-900 rounded-xl p-6 relative overflow-hidden shadow-2xl"
    >
      {/* Panel Header & Collapsible Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-transparent border-none p-0 text-left cursor-pointer group focus:outline-none"
      >
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:bg-blue-500/25">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#F8FAFC] m-0 group-hover:text-blue-400 transition-colors tracking-tight font-heading">
                Theory & Fundamentals of Wire Drawing
              </h3>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full uppercase">
                Interactive Engineering Guide
              </span>
            </div>
            <p className="text-xs text-slate-400 m-0 mt-0.5">
              Explore deformation mechanics, die geometry parameters, mathematical formulas, and why specific pass rules are used.
            </p>
          </div>
        </div>
        <div className="text-slate-400 group-hover:text-white transition-colors p-2 rounded-lg bg-slate-900/50 border border-slate-800">
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mt-6 pt-5 border-t border-slate-900"
          >
            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-900 pb-4 mb-6">
              {[
                { id: 'cad', label: '1. Die Geometry Inspector', icon: Layers },
                { id: 'simulator', label: '2. Live Deformation Mechanics', icon: Sliders },
                { id: 'formulas', label: '3. Mathematical Equations', icon: Cpu },
                { id: 'tradeoffs', label: '4. Trade-Offs & Why We Use X vs Y', icon: Scale },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex items-center space-x-2 py-2 px-3.5 rounded-lg text-xs font-semibold focus:outline-none transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)] font-bold'
                        : 'bg-slate-950/60 text-slate-400 border border-slate-900 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: CAD DIE GEOMETRY INSPECTOR */}
            {activeTab === 'cad' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Interactive SVG Diagram */}
                  <div className="lg:col-span-7 bg-slate-950/90 border border-slate-900 rounded-xl p-5 relative overflow-hidden flex flex-col items-center">
                    <div className="w-full flex justify-between items-center mb-3">
                      <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                        Cross-Sectional Die Profile & Zones
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Click any zone below to inspect specs
                      </span>
                    </div>

                    {/* Interactive CAD Die SVG */}
                    <div className="w-full max-w-[520px] relative py-2">
                      <svg viewBox="0 0 500 240" className="w-full h-auto drop-shadow-md select-none">
                        <defs>
                          <linearGradient id="nib-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#1E293B" stopOpacity="0.9" />
                            <stop offset="100%" stopColor="#0F172A" stopOpacity="0.95" />
                          </linearGradient>
                          <linearGradient id="wire-in-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#B45309" />
                            <stop offset="100%" stopColor="#D97706" />
                          </linearGradient>
                          <linearGradient id="wire-out-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#FBBF24" />
                          </linearGradient>
                        </defs>

                        {/* Background Centerline */}
                        <line x1="10" y1="120" x2="490" y2="120" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
                        <text x="480" y="114" fill="#64748B" fontSize="9" fontFamily="monospace" textAnchor="end">
                          Centerline (CL)
                        </text>

                        {/* Upper Die Nib Profile */}
                        <path
                          d="M 20 20 L 100 20 L 100 50 L 180 50 L 300 85 L 370 85 L 440 30 L 480 30 L 480 10 L 20 10 Z"
                          fill="url(#nib-grad)"
                          stroke="#334155"
                          strokeWidth="1.5"
                        />
                        {/* Lower Die Nib Profile */}
                        <path
                          d="M 20 220 L 100 220 L 100 190 L 180 190 L 300 155 L 370 155 L 440 210 L 480 210 L 480 230 L 20 230 Z"
                          fill="url(#nib-grad)"
                          stroke="#334155"
                          strokeWidth="1.5"
                        />

                        {/* Wire Flow Geometry */}
                        {/* Incoming Wire */}
                        <rect x="10" y="55" width="170" height="130" fill="url(#wire-in-grad)" opacity="0.8" />
                        {/* Reduction Taper Wire */}
                        <polygon points="180,55 300,85 300,155 180,185" fill="url(#wire-in-grad)" opacity="0.9" />
                        {/* Outgoing Wire */}
                        <rect x="300" y="85" width="190" height="70" fill="url(#wire-out-grad)" opacity="0.95" />

                        {/* Interactive Clickable Hotspots & Overlays */}
                        {/* 1. Entrance Zone */}
                        <polygon
                          points="100,50 180,50 180,190 100,190"
                          fill={selectedZone === 'entrance' ? DIE_ZONES.entrance.bgColor : 'transparent'}
                          stroke={selectedZone === 'entrance' ? DIE_ZONES.entrance.color : '#3B82F6'}
                          strokeWidth={selectedZone === 'entrance' ? '2' : '0.75'}
                          strokeDasharray={selectedZone === 'entrance' ? 'none' : '3 3'}
                          className="cursor-pointer hover:opacity-80 transition-all"
                          onClick={() => setSelectedZone('entrance')}
                        />
                        <text x="140" y="42" fill="#60A5FA" fontSize="10" fontWeight="bold" textAnchor="middle" className="cursor-pointer" onClick={() => setSelectedZone('entrance')}>
                          Entrance Bell
                        </text>

                        {/* 2. Approach Angle (2α) */}
                        <polygon
                          points="180,50 300,85 300,155 180,190"
                          fill={selectedZone === 'approach' ? DIE_ZONES.approach.bgColor : 'transparent'}
                          stroke={selectedZone === 'approach' ? DIE_ZONES.approach.color : '#10B981'}
                          strokeWidth={selectedZone === 'approach' ? '2.5' : '1'}
                          className="cursor-pointer hover:opacity-80 transition-all"
                          onClick={() => setSelectedZone('approach')}
                        />
                        <text x="240" y="42" fill="#34D399" fontSize="10" fontWeight="bold" textAnchor="middle" className="cursor-pointer" onClick={() => setSelectedZone('approach')}>
                          Approach 2α
                        </text>

                        {/* 3. Bearing Land (Lb) */}
                        <rect
                          x="300"
                          y="85"
                          width="70"
                          height="70"
                          fill={selectedZone === 'bearing' ? DIE_ZONES.bearing.bgColor : 'transparent'}
                          stroke={selectedZone === 'bearing' ? DIE_ZONES.bearing.color : '#F59E0B'}
                          strokeWidth={selectedZone === 'bearing' ? '2.5' : '1'}
                          className="cursor-pointer hover:opacity-80 transition-all"
                          onClick={() => setSelectedZone('bearing')}
                        />
                        <text x="335" y="42" fill="#FBBF24" fontSize="10" fontWeight="bold" textAnchor="middle" className="cursor-pointer" onClick={() => setSelectedZone('bearing')}>
                          Bearing Lb
                        </text>

                        {/* 4. Exit Relief (γ) */}
                        <polygon
                          points="370,85 440,30 440,210 370,155"
                          fill={selectedZone === 'exit' ? DIE_ZONES.exit.bgColor : 'transparent'}
                          stroke={selectedZone === 'exit' ? DIE_ZONES.exit.color : '#EC4899'}
                          strokeWidth={selectedZone === 'exit' ? '2.5' : '1'}
                          className="cursor-pointer hover:opacity-80 transition-all"
                          onClick={() => setSelectedZone('exit')}
                        />
                        <text x="410" y="24" fill="#F472B6" fontSize="10" fontWeight="bold" textAnchor="middle" className="cursor-pointer" onClick={() => setSelectedZone('exit')}>
                          Back Relief γ
                        </text>
                      </svg>
                    </div>

                    {/* Zone Selector Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full mt-4">
                      {Object.values(DIE_ZONES).map((z) => (
                        <button
                          key={z.id}
                          onClick={() => setSelectedZone(z.id)}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold transition-all text-center border cursor-pointer ${
                            selectedZone === z.id
                              ? 'bg-slate-800 text-white border-blue-500 shadow-md scale-102'
                              : 'bg-slate-900/60 text-slate-400 border-slate-900 hover:text-slate-200'
                          }`}
                          style={{ borderColor: selectedZone === z.id ? z.color : undefined }}
                        >
                          {z.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Zone Detail Card */}
                  <div className="lg:col-span-5 bg-slate-950/90 border border-slate-900 rounded-xl p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: activeZoneInfo.color }}
                        />
                        <h4 className="text-sm font-bold text-[#F8FAFC] m-0 font-heading">
                          {activeZoneInfo.name}
                        </h4>
                      </div>

                      <div className="inline-block bg-slate-900 border border-slate-800 rounded-md px-2.5 py-1 text-[11px] font-mono font-bold text-blue-400 mb-3">
                        Optimal Spec: {activeZoneInfo.angleOrSpec}
                      </div>

                      <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                        <div className="bg-slate-900/40 border border-slate-800/60 p-3 rounded-lg">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                            Primary Functional Purpose
                          </span>
                          <p className="m-0 text-slate-300 text-[11px] leading-snug">
                            {activeZoneInfo.purpose}
                          </p>
                        </div>

                        <div className="bg-rose-950/20 border border-rose-900/30 p-3 rounded-lg">
                          <div className="flex items-center gap-1.5 text-rose-400 text-[10px] uppercase tracking-wider font-bold mb-1">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Risk of Misconfiguration</span>
                          </div>
                          <p className="m-0 text-rose-200/90 text-[11px] leading-snug">
                            {activeZoneInfo.misconfigRisk}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LIVE DEFORMATION MECHANICS SIMULATOR */}
            {activeTab === 'simulator' && (
              <div className="space-y-6">
                <div className="bg-slate-950/90 border border-slate-900 rounded-xl p-5 space-y-5">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-900">
                    <div>
                      <h4 className="text-sm font-bold text-white m-0 font-heading">
                        Interactive Draft Parameter Simulator
                      </h4>
                      <p className="text-xs text-slate-400 m-0">
                        Adjust incoming diameter ($d_1$) and outgoing diameter ($d_2$) to see real-time physical deformation metrics.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/30 px-2.5 py-1 border border-blue-900/40 rounded-lg">
                      Pass Mechanics
                    </span>
                  </div>

                  {/* Controls Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Inlet Slider */}
                    <div className="space-y-2 bg-slate-900/40 p-4 rounded-xl border border-slate-800/60">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">Inlet Diameter (d₁):</span>
                        <span className="text-blue-400 font-bold">{simDin.toFixed(3)} mm</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="8.0"
                        step="0.05"
                        value={simDin}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setSimDin(val);
                          if (simDout >= val) setSimDout(Math.max(0.4, val - 0.2));
                        }}
                        className="w-full accent-blue-500 cursor-pointer"
                      />
                    </div>

                    {/* Outlet Slider */}
                    <div className="space-y-2 bg-slate-900/40 p-4 rounded-xl border border-slate-800/60">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">Outlet Diameter (d₂):</span>
                        <span className="text-emerald-400 font-bold">{simDout.toFixed(3)} mm</span>
                      </div>
                      <input
                        type="range"
                        min="0.4"
                        max={Math.max(0.5, simDin - 0.05)}
                        step="0.05"
                        value={simDout}
                        onChange={(e) => setSimDout(parseFloat(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Calculated Output Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                    <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl text-center">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">Area Reduction (R)</span>
                      <span className="text-base font-mono font-extrabold text-emerald-400 block mt-1">
                        {areaRed.toFixed(1)}%
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">Cross-section loss</span>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl text-center">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">Elongation (E)</span>
                      <span className="text-base font-mono font-extrabold text-amber-400 block mt-1">
                        +{elongation.toFixed(1)}%
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">Length growth</span>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl text-center">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">Capstan Speed Ratio</span>
                      <span className="text-base font-mono font-extrabold text-blue-400 block mt-1">
                        {speedRatio.toFixed(2)}x
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">v₂ / v₁ ratio</span>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl text-center">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">True Strain (ε)</span>
                      <span className="text-base font-mono font-extrabold text-purple-400 block mt-1">
                        {trueStrain.toFixed(3)}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">ln(A₀/A₁)</span>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl text-center">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">Draw Stress Ratio</span>
                      <span className="text-base font-mono font-extrabold text-cyan-400 block mt-1">
                        {(drawStressRatio * 100).toFixed(0)}% σy
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">% of Yield Limit</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-blue-500/5 border border-blue-500/15 rounded-xl text-xs text-slate-300 flex items-start gap-3">
                    <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <strong className="text-white block font-heading text-[11px] uppercase tracking-wide">
                        Key Insight: Why Elongation % is always larger than Area Reduction %
                      </strong>
                      <p className="m-0 text-[11px] leading-relaxed text-slate-400">
                        Notice how a <strong>{areaRed.toFixed(1)}%</strong> area reduction generates a <strong>+{elongation.toFixed(1)}%</strong> length increase. 
                        Because <strong>E = R / (1 - R)</strong>, as the denominator (1 - R) shrinks below 1.0, elongation grows non-linearly. Downstream drawing machine capstans must accelerate at exactly <strong>{speedRatio.toFixed(2)}x</strong> to maintain smooth continuous wire tension!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: MATHEMATICAL EQUATIONS & PHYSICS */}
            {activeTab === 'formulas' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950/90 border border-slate-900 p-4 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2 m-0">
                    <Zap className="w-4 h-4 text-blue-400" />
                    1. Volume Conservation & Speed Matching
                  </h4>
                  <p className="text-slate-400 m-0 leading-relaxed text-[11px]">
                    During plastic cold deformation, density is constant (ρ_in ≈ ρ_out). Therefore, metal volume entering equals volume exiting:
                  </p>
                  <div className="bg-black/30 p-3 rounded-lg border border-slate-800 font-mono text-blue-400 text-center">
                    A₁ × v₁ = A₂ × v₂  ⟹  v₂ = v₁ × (A₁ / A₂) = v₁ × (1 + E)
                  </div>
                </div>

                <div className="bg-slate-950/90 border border-slate-900 p-4 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 m-0">
                    <Target className="w-4 h-4 text-emerald-400" />
                    2. Siebel's Drawing Force Equation
                  </h4>
                  <p className="text-slate-400 m-0 leading-relaxed text-[11px]">
                    The required drawing stress (σ_d) is divided into three distinct physical energy components:
                  </p>
                  <div className="bg-black/30 p-3 rounded-lg border border-slate-800 font-mono text-emerald-400 text-center">
                    σ_d = σ_ym · ln(A₁/A₂) + (2/3)·σ_ym·α + μ·σ_ym·(Lb/d₂)
                  </div>
                  <div className="text-[10px] text-slate-500 grid grid-cols-3 gap-1 text-center font-mono">
                    <span>[1. Homogeneous Work]</span>
                    <span>[2. Redundant Work]</span>
                    <span>[3. Friction Work]</span>
                  </div>
                </div>

                <div className="bg-slate-950/90 border border-slate-900 p-4 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2 m-0">
                    <Activity className="w-4 h-4 text-amber-400" />
                    3. True Strain (Additive Deformation)
                  </h4>
                  <p className="text-slate-400 m-0 leading-relaxed text-[11px]">
                    Engineering reduction % cannot be added across passes. True logarithmic strain (ε) is additive over multi-pass schedules:
                  </p>
                  <div className="bg-black/30 p-3 rounded-lg border border-slate-800 font-mono text-amber-400 text-center">
                    ε_total = ε₁ + ε₂ + ... + ε_n = ln(A_initial / A_final)
                  </div>
                </div>

                <div className="bg-slate-950/90 border border-slate-900 p-4 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2 m-0">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    4. Optimum Die Angle (α_opt)
                  </h4>
                  <p className="text-slate-400 m-0 leading-relaxed text-[11px]">
                    As semi-die angle α increases, friction decreases but redundant shear work increases. The total force curve forms a minimum at α_opt:
                  </p>
                  <div className="bg-black/30 p-3 rounded-lg border border-slate-800 font-mono text-purple-400 text-center">
                    α_opt ≈ √( (3/2) · μ · (Lb / d₂) / ln(A₁/A₂) )
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: TRADE-OFFS & WHY WE USE X VS Y */}
            {activeTab === 'tradeoffs' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Trade-off 1 */}
                  <div className="bg-slate-950/90 border border-slate-900 p-4 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-400 font-heading text-xs">
                        Tungsten Carbide (TC) vs Polycrystalline Diamond (PCD)
                      </span>
                      <span className="text-[10px] font-mono bg-blue-950/40 text-blue-300 px-2 py-0.5 rounded border border-blue-900/30">
                        Nib Material
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed m-0">
                      <strong>Why TC for Rod Breakdown (&gt;1.5mm):</strong> Carbide has high fracture toughness to handle heavy shock loads and raw rod scale.
                    </p>
                    <p className="text-slate-400 text-[11px] leading-relaxed m-0">
                      <strong>Why PCD for Fine Wire (&lt;1.5mm):</strong> PCD has extreme hardness and zero wear rate, eliminating die sizing drift over millions of meters.
                    </p>
                  </div>

                  {/* Trade-off 2 */}
                  <div className="bg-slate-950/90 border border-slate-900 p-4 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400 font-heading text-xs">
                        Non-Ferrous (Cu/Al) vs High-Carbon Steel
                      </span>
                      <span className="text-[10px] font-mono bg-emerald-950/40 text-emerald-300 px-2 py-0.5 rounded border border-emerald-900/30">
                        Pass Reductions
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed m-0">
                      <strong>Copper/Aluminum (20% - 25% AR):</strong> High ductility FCC lattice allows aggressive reductions per pass without embrittlement.
                    </p>
                    <p className="text-slate-400 text-[11px] leading-relaxed m-0">
                      <strong>Steel/Alloys (10% - 18% AR):</strong> Rapid strain hardening requires lighter passes to avoid tensile failure inside the die cone.
                    </p>
                  </div>

                  {/* Trade-off 3 */}
                  <div className="bg-slate-950/90 border border-slate-900 p-4 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400 font-heading text-xs">
                        Dry Soap Lubrication vs Wet Emulsion
                      </span>
                      <span className="text-[10px] font-mono bg-amber-950/40 text-amber-300 px-2 py-0.5 rounded border border-amber-900/30">
                        Cooling & Friction
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed m-0">
                      <strong>Dry Soap:</strong> Forms a thick sodium/calcium stearate pressure film required for heavy breakdown forces.
                    </p>
                    <p className="text-slate-400 text-[11px] leading-relaxed m-0">
                      <strong>Wet Emulsion:</strong> Provides rapid thermal heat dissipation and chip flushing on multi-wire machines running &gt;30 m/s.
                    </p>
                  </div>

                  {/* Trade-off 4 */}
                  <div className="bg-slate-950/90 border border-slate-900 p-4 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-400 font-heading text-xs">
                        Large vs Small Die Approach Angle (2α)
                      </span>
                      <span className="text-[10px] font-mono bg-purple-950/40 text-purple-300 px-2 py-0.5 rounded border border-purple-900/30">
                        Cone Geometry
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed m-0">
                      <strong>Too Large Angle (&gt;18°):</strong> High redundant shear stress causes internal "cup and cone" center burst defects.
                    </p>
                    <p className="text-slate-400 text-[11px] leading-relaxed m-0">
                      <strong>Too Small Angle (&lt;10°):</strong> Long contact area generates massive friction heat and rapid abrasive die wear.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
