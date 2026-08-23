import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sliders,
  TrendingDown,
  Maximize2,
  Table,
  Info,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Plus,
  Minus,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react'

interface RoundCalculatorProps {
  // Round state
  roundCalcMode: string
  setRoundCalcMode: (mode: any) => void
  roundInlet: string
  setRoundInlet: (val: string) => void
  roundOutlet: string
  setRoundOutlet: (val: string) => void
  roundTargetRed: string
  setRoundTargetRed: (val: string) => void
  roundTargetElong: string
  setRoundTargetElong: (val: string) => void
  
  // Computed results
  roundResults: any
  roundValidationError: string | null
  
  // Physics (needed for results card)
  drawSpeed: string
  dieAngle: string
  yieldStrength: string
  uts: string
  mu: number
  materialType: string
  
  // Die matching
  matchingDies: Record<number, any[]>
  loadingDies: Record<number, boolean>
  findMatchingDies: (passNo: number, targetSize: number) => Promise<void>

  // Material limit helper
  getMaterialLimit: () => number
}

export function RoundCalculator({
  roundCalcMode,
  setRoundCalcMode,
  roundInlet,
  setRoundInlet,
  roundOutlet,
  setRoundOutlet,
  roundTargetRed,
  setRoundTargetRed,
  roundTargetElong,
  setRoundTargetElong,
  roundResults,
  roundValidationError,
  uts,
  mu,
  matchingDies,
  loadingDies,
  findMatchingDies,
  getMaterialLimit,
}: RoundCalculatorProps) {
  const [viewAngle, setViewAngle] = useState<'die_section' | 'wire_cross'>('wire_cross')

  // Step adjustment helpers
  const adjustInlet = (delta: number) => {
    const current = parseFloat(roundInlet) || 8.0
    const updated = Math.max(0.1, current + delta)
    setRoundInlet(updated.toFixed(2))
  }

  const adjustOutlet = (delta: number) => {
    const current = parseFloat(roundOutlet) || 6.5
    const updated = Math.max(0.05, current + delta)
    setRoundOutlet(updated.toFixed(2))
  }

  const adjustReduction = (delta: number) => {
    const current = parseFloat(roundTargetRed) || 20.0
    const updated = Math.max(1, Math.min(99, current + delta))
    setRoundTargetRed(updated.toFixed(1))
  }

  const adjustElongation = (delta: number) => {
    const current = parseFloat(roundTargetElong) || 25.0
    const updated = Math.max(1, current + delta)
    setRoundTargetElong(updated.toFixed(1))
  }

  return (
    <>
      {/* Left Column: Interactive Input Deck */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          document.getElementById('calculation-results')?.scrollIntoView({ behavior: 'smooth' });
        }}
        className="lg:col-span-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 space-y-5 font-mono shadow-sm"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                01 PROCESS VARIABLES
              </h3>
              <p className="text-[10px] text-[var(--color-muted)] m-0">
                Configure input parameters & deformation mode
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/25 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            LIVE CALC
          </span>
        </div>
        
        {/* Sizing Mode Selection Segmented Buttons */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider block">
            Calculation Mode
          </label>
          <div className="grid grid-cols-3 gap-1.5 bg-[var(--color-surface-2)] p-1 rounded-lg border border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setRoundCalcMode('forward')}
              className={`py-2 px-2 rounded-md text-center transition cursor-pointer text-[10px] font-bold uppercase flex flex-col items-center gap-1 ${
                roundCalcMode === 'forward' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Forward (d₁→d₂)</span>
            </button>

            <button
              type="button"
              onClick={() => setRoundCalcMode('backward_red')}
              className={`py-2 px-2 rounded-md text-center transition cursor-pointer text-[10px] font-bold uppercase flex flex-col items-center gap-1 ${
                roundCalcMode === 'backward_red' 
                  ? 'bg-cyan-600 text-white shadow-sm' 
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
              }`}
            >
              <TrendingDown className="h-3.5 w-3.5" />
              <span>Target Red %</span>
            </button>

            <button
              type="button"
              onClick={() => setRoundCalcMode('backward_elong')}
              className={`py-2 px-2 rounded-md text-center transition cursor-pointer text-[10px] font-bold uppercase flex flex-col items-center gap-1 ${
                roundCalcMode === 'backward_elong' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
              }`}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Target Elong %</span>
            </button>
          </div>
        </div>

        {/* Input Parameters Deck */}
        <div className="space-y-4 pt-1">
          {/* Inlet Diameter Input */}
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-[var(--color-text)] uppercase tracking-wider">
                Inlet Diameter (d₁)
              </label>
              <span className="text-[10px] text-[var(--color-muted)]">Raw Stock Entry</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustInlet(-0.1)}
                className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center transition cursor-pointer"
                title="Decrease 0.1 mm"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <div className="relative flex-1">
                <input 
                  type="number" 
                  step="0.01" 
                  value={roundInlet}
                  onChange={(e) => setRoundInlet(e.target.value)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-center text-sm font-bold text-[var(--color-text)] focus:border-blue-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-[10px] text-[var(--color-muted)] font-bold">
                  mm
                </span>
              </div>
              <button
                type="button"
                onClick={() => adjustInlet(0.1)}
                className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center transition cursor-pointer"
                title="Increase 0.1 mm"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Mode-specific Input Card */}
          {roundCalcMode === 'forward' && (
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                  Outlet Diameter (d₂)
                </label>
                <span className="text-[10px] text-[var(--color-muted)]">Finished Die Size</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => adjustOutlet(-0.05)}
                  className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center transition cursor-pointer"
                  title="Decrease 0.05 mm"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <div className="relative flex-1">
                  <input 
                    type="number" 
                    step="0.01" 
                    value={roundOutlet}
                    onChange={(e) => setRoundOutlet(e.target.value)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-center text-sm font-bold text-blue-400 focus:border-blue-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] text-[var(--color-muted)] font-bold">
                    mm
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => adjustOutlet(0.05)}
                  className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center transition cursor-pointer"
                  title="Increase 0.05 mm"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {roundCalcMode === 'backward_red' && (
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                  Target Area Reduction (R)
                </label>
                <span className="text-[10px] text-[var(--color-muted)]">Max Safe Limit: {getMaterialLimit()}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => adjustReduction(-0.5)}
                  className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center transition cursor-pointer"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <div className="relative flex-1">
                  <input 
                    type="number" 
                    step="0.1" 
                    value={roundTargetRed}
                    onChange={(e) => setRoundTargetRed(e.target.value)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-center text-sm font-bold text-cyan-400 focus:border-cyan-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] text-[var(--color-muted)] font-bold">
                    %
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => adjustReduction(0.5)}
                  className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {roundCalcMode === 'backward_elong' && (
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                  Target Elongation Strain (E)
                </label>
                <span className="text-[10px] text-[var(--color-muted)]">Length Gain Multiplier</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => adjustElongation(-1.0)}
                  className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center transition cursor-pointer"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <div className="relative flex-1">
                  <input 
                    type="number" 
                    step="0.5" 
                    value={roundTargetElong}
                    onChange={(e) => setRoundTargetElong(e.target.value)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-center text-sm font-bold text-purple-400 focus:border-purple-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] text-[var(--color-muted)] font-bold">
                    %
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => adjustElongation(1.0)}
                  className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Quick Slider for Active Parameter */}
          {roundCalcMode === 'forward' && (
            <div className="space-y-1.5 px-1">
              <div className="flex justify-between text-[10px] text-[var(--color-muted)] font-bold">
                <span>Fine-tune Outlet (d₂)</span>
                <span className="text-blue-400">{parseFloat(roundOutlet) || 0} mm</span>
              </div>
              <input
                type="range"
                min="0.1"
                max={parseFloat(roundInlet) || 10}
                step="0.05"
                value={parseFloat(roundOutlet) || 0}
                onChange={(e) => setRoundOutlet(parseFloat(e.target.value).toFixed(2))}
                className="w-full h-1.5 bg-[var(--color-surface-2)] rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          )}
        </div>
      </form>

      {/* Right Column: Live Telemetry & CAD Blueprint */}
      <div id="calculation-results" className="lg:col-span-7 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 flex flex-col justify-between shadow-sm min-h-[500px] font-mono space-y-5">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                02 GEOMETRY & TELEMETRY SUMMARY
              </h3>
            </div>
            
            {/* Blueprint view switcher */}
            <div className="flex items-center gap-1 bg-[var(--color-surface-2)] p-1 rounded-lg border border-[var(--color-border)] text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setViewAngle('wire_cross')}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${
                  viewAngle === 'wire_cross'
                    ? 'bg-blue-600 text-white'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                Concentric Cross-Section
              </button>
              <button
                type="button"
                onClick={() => setViewAngle('die_section')}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${
                  viewAngle === 'die_section'
                    ? 'bg-blue-600 text-white'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                2D Die Profile
              </button>
            </div>
          </div>

          {roundResults ? (
            <>
              {/* CAD Geometry Visualizer */}
              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-3 left-4 text-[10px] font-bold text-[var(--color-muted)] tracking-wider flex items-center gap-1.5 uppercase">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  {viewAngle === 'wire_cross' ? 'Concentric Circular Cross-Section' : 'Longitudinal Reduction Profile'}
                </div>

                {viewAngle === 'wire_cross' ? (
                  /* Concentric Circular Cross-Section Blueprint */
                  (() => {
                    const d1 = parseFloat(roundInlet) || 8.00
                    const d2 = roundResults.outlet || 6.50
                    const maxD = Math.max(d1, d2, 1)
                    const r1 = Math.min(65, (d1 / maxD) * 65)
                    const r2 = Math.min(65, (d2 / maxD) * 65)

                    return (
                      <svg className="w-full h-[180px]" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <pattern id="reducedAreaHatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                            <line x1="0" y1="0" x2="0" y2="6" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.4" />
                          </pattern>
                          <radialGradient id="finishedCoreGrad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.6" />
                          </radialGradient>
                        </defs>

                        {/* Center Grid Crosshair */}
                        <line x1="200" y1="20" x2="200" y2="180" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="100" y1="100" x2="300" y2="100" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3 3" />

                        {/* Outer Circle (Inlet Area A1) */}
                        <circle cx="200" cy="100" r={r1} fill="url(#reducedAreaHatch)" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 2" />

                        {/* Inner Circle (Outlet Area A2) */}
                        <circle cx="200" cy="100" r={r2} fill="url(#finishedCoreGrad)" stroke="#a855f7" strokeWidth="2" />

                        {/* Dimension Caliper Annotations */}
                        <text x="70" y="50" fill="#3b82f6" fontSize="11" fontFamily="monospace" fontWeight="bold">
                          d₁: {d1.toFixed(2)} mm ({roundResults.inArea.toFixed(2)} mm²)
                        </text>
                        <text x="330" y="160" fill="#a855f7" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="end">
                          d₂: {d2.toFixed(3)} mm ({roundResults.outArea.toFixed(2)} mm²)
                        </text>

                        {/* Center Dimension Arrow Callout */}
                        <text x="200" y="104" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                          Core d₂
                        </text>
                      </svg>
                    )
                  })()
                ) : (
                  /* 2D Die Longitudinal Schematic */
                  (() => {
                    const inletVal = parseFloat(roundInlet) || 8.00
                    const outletVal = roundResults.outlet
                    const maxVal = Math.max(inletVal, outletVal, 1)
                    const scale = 60 / maxVal

                    const inletHeight = inletVal * scale
                    const outletHeight = outletVal * scale
                    const inletY = 100 - (inletHeight / 2)
                    const outletY = 100 - (outletHeight / 2)
                    const drawingRatio = roundResults.elongationRatio

                    return (
                      <svg className="w-full h-[180px]" viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="metalFlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.5" />
                          </linearGradient>
                        </defs>

                        {/* Center line */}
                        <line x1="20" y1="100" x2="480" y2="100" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4 3" />

                        {/* Wire Profile */}
                        <path 
                          d={`M 20,${inletY} L 220,${inletY} L 280,${outletY} L 480,${outletY} L 480,${outletY + outletHeight} L 280,${outletY + outletHeight} L 220,${inletY + inletHeight} L 20,${inletY + inletHeight} Z`}
                          fill="url(#metalFlowGrad)"
                          stroke="#3b82f6"
                          strokeWidth="1.5"
                        />

                        {/* Top Die Block */}
                        <path 
                          d={`M 210,25 L 290,25 L 290,${outletY - 3} L 280,${outletY - 3} L 220,${inletY - 3} L 210,${inletY - 3} Z`}
                          fill="var(--color-surface-2)"
                          stroke="var(--color-border)"
                          strokeWidth="1.5"
                        />

                        {/* Bottom Die Block */}
                        <path 
                          d={`M 210,175 L 290,175 L 290,${outletY + outletHeight + 3} L 280,${outletY + outletHeight + 3} L 220,${inletY + inletHeight + 3} L 210,${inletY + inletHeight + 3} Z`}
                          fill="var(--color-surface-2)"
                          stroke="var(--color-border)"
                          strokeWidth="1.5"
                        />

                        {/* Dimension Calipers */}
                        <text x="35" y={inletY - 6} fill="#3b82f6" fontSize="10" fontFamily="monospace" fontWeight="bold">
                          d₁ = {inletVal.toFixed(2)}mm
                        </text>
                        <text x="465" y={outletY - 6} fill="#a855f7" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="end">
                          d₂ = {outletVal.toFixed(3)}mm
                        </text>

                        {/* Velocity Multiplier */}
                        <text x="250" y="104" fill="#06b6d4" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                          λ = {drawingRatio.toFixed(3)}x
                        </text>
                      </svg>
                    )
                  })()
                )}
              </div>

              {/* Yield Safety & Material Limit Banner */}
              {(() => {
                const limit = getMaterialLimit()
                const reduction = roundResults.reduction
                const pctOfLimit = Math.min(150, (reduction / limit) * 100)
                const isUnsafe = reduction > limit
                const isWarning = reduction > limit * 0.85

                return (
                  <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isUnsafe ? (
                          <ShieldAlert className="h-4 w-4 text-rose-500" />
                        ) : (
                          <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        )}
                        <span className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wide">
                          Draft Safety Margin: {reduction.toFixed(1)}% / {limit}% Max
                        </span>
                      </div>
                      <span className={`text-xs font-bold font-mono ${
                        isUnsafe ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-emerald-500'
                      }`}>
                        {pctOfLimit.toFixed(0)}% of Limit
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isUnsafe 
                            ? 'bg-rose-500' 
                            : isWarning 
                              ? 'bg-amber-500' 
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, pctOfLimit)}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-[var(--color-muted)] m-0 leading-relaxed">
                      {isUnsafe ? (
                        <span className="text-rose-400 font-bold">
                          ⚠️ Warning: Area reduction exceeds safe single-pass limit for this alloy. Risk of wire tensile rupture or internal chevrons.
                        </span>
                      ) : (
                        <span>
                          ✓ Safe Single-Pass Deformation. The tensile stress during reduction remains securely within allowable strain-hardening limits.
                        </span>
                      )}
                    </p>
                  </div>
                )
              })()}

              {/* Primary KPI Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
                {/* KPI 1: Outlet Size */}
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3.5 rounded-xl">
                  <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block mb-1">
                    Finished Die (d₂)
                  </span>
                  <div className="text-lg font-bold font-mono text-[var(--color-text)] tabular-nums">
                    {roundResults.outlet.toFixed(3)} <span className="text-xs text-[var(--color-muted)]">mm</span>
                  </div>
                </div>

                {/* KPI 2: Area Reduction */}
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3.5 rounded-xl">
                  <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block mb-1">
                    Area Reduction (R)
                  </span>
                  <div className="text-lg font-bold font-mono text-cyan-400 tabular-nums">
                    {roundResults.reduction.toFixed(2)}%
                  </div>
                </div>

                {/* KPI 3: Elongation */}
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3.5 rounded-xl">
                  <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block mb-1">
                    Elongation Strain (E)
                  </span>
                  <div className="text-lg font-bold font-mono text-purple-400 tabular-nums">
                    +{roundResults.elongation.toFixed(2)}%
                  </div>
                </div>

                {/* KPI 4: Drawing Ratio */}
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3.5 rounded-xl">
                  <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block mb-1">
                    Velocity Ratio (λ)
                  </span>
                  <div className="text-lg font-bold font-mono text-emerald-400 tabular-nums">
                    {roundResults.elongationRatio.toFixed(3)}x
                  </div>
                </div>

                {/* KPI 5: Drawing Force */}
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3.5 rounded-xl">
                  <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block mb-1">
                    Drawing Pull Force
                  </span>
                  <div className="text-lg font-bold font-mono text-amber-400 tabular-nums">
                    {((roundResults.drawingForce || 0) / 1000).toFixed(2)} <span className="text-xs text-[var(--color-muted)]">kN</span>
                  </div>
                </div>

                {/* KPI 6: Motor Power */}
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3.5 rounded-xl">
                  <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block mb-1">
                    Active Power Demand
                  </span>
                  <div className="text-lg font-bold font-mono text-blue-400 tabular-nums">
                    {(roundResults.powerKw || 0).toFixed(2)} <span className="text-xs text-[var(--color-muted)]">kW</span>
                  </div>
                </div>
              </div>

              {/* Matched Dies in Inventory Widget */}
              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                  <div className="flex items-center gap-2">
                    <Table className="h-4 w-4 text-blue-400" />
                    <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                      Stock Inventory Matches (Target: {roundResults.outlet.toFixed(3)} mm)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => findMatchingDies(888, roundResults.outlet)}
                    disabled={loadingDies[888]}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer disabled:opacity-50 uppercase"
                  >
                    {loadingDies[888] ? 'Searching...' : 'Scan Stock'}
                  </button>
                </div>

                {matchingDies[888] ? (
                  <div className="space-y-2">
                    {matchingDies[888].length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {matchingDies[888].map((die) => (
                          <div
                            key={die.die_id}
                            className="p-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-xs text-[var(--color-text)]">
                                {die.die_id}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                die.status === 'AVAILABLE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>
                                {die.status}
                              </span>
                            </div>
                            <div className="flex justify-between text-[10px] text-[var(--color-muted)]">
                              <span>Size: {parseFloat(die.current_size).toFixed(3)} mm</span>
                              <span>{die.location_name || 'Storage'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--color-muted)] m-0 text-center py-2">
                        No active stock dies found within ±0.05 mm of target.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-muted)] m-0">
                    Click <strong>Scan Stock</strong> to query live warehouse inventory for available dies matching {roundResults.outlet.toFixed(3)} mm.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl py-14 px-4 flex flex-col items-center justify-center text-center space-y-3">
              <div className={`p-3 rounded-xl border ${roundValidationError ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-muted)]'}`}>
                {roundValidationError ? <AlertTriangle className="h-6 w-6" /> : <Info className="h-6 w-6" />}
              </div>
              <div className="space-y-1 max-w-md">
                <h4 className={`text-sm font-bold uppercase ${roundValidationError ? 'text-amber-400' : 'text-[var(--color-text)]'}`}>
                  {roundValidationError ? 'Invalid Sizing Parameters' : 'Awaiting Sizing Input'}
                </h4>
                <p className="text-xs text-[var(--color-muted)]">
                  {roundValidationError || 'Enter diameters in the left panel to calculate area reduction, strain, and mechanical drawing force.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

