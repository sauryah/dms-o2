import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  RectangleHorizontal,
  TrendingDown,
  Ruler,
  Table,
  Info,
  AlertTriangle,
  Zap,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Sparkles
} from 'lucide-react'

interface FlatCalculatorProps {
  // Flat state
  flatInWidth: string
  setFlatInWidth: (val: string) => void
  flatInThick: string
  setFlatInThick: (val: string) => void
  flatOutWidth: string
  setFlatOutWidth: (val: string) => void
  flatOutThick: string
  setFlatOutThick: (val: string) => void

  // Computed results
  flatResults: any
  flatValidationError: string | null

  // Physics
  drawSpeed: string
  dieAngle: string
  mu: number
  materialType: string
  yieldStrength: string
  uts: string

  // Physics helpers
  getMaterialLimit: () => number

  // Die matching
  matchingDies: Record<number, any[]>
  loadingDies: Record<number, boolean>
  findMatchingFlatDies: (passNo: number, width: number, thickness: number) => Promise<void>
}

export function FlatCalculator({
  flatInWidth,
  setFlatInWidth,
  flatInThick,
  setFlatInThick,
  flatOutWidth,
  setFlatOutWidth,
  flatOutThick,
  setFlatOutThick,
  flatResults,
  flatValidationError,
  mu,
  uts,
  getMaterialLimit,
  matchingDies,
  loadingDies,
  findMatchingFlatDies,
}: FlatCalculatorProps) {
  const [viewMode, setViewMode] = useState<'overlay' | 'side_by_side'>('overlay')

  // Step adjustments
  const adjustInWidth = (delta: number) => {
    const current = parseFloat(flatInWidth) || 20.0
    const updated = Math.max(0.5, current + delta)
    setFlatInWidth(updated.toFixed(2))
  }

  const adjustInThick = (delta: number) => {
    const current = parseFloat(flatInThick) || 5.0
    const updated = Math.max(0.2, current + delta)
    setFlatInThick(updated.toFixed(2))
  }

  const adjustOutWidth = (delta: number) => {
    const current = parseFloat(flatOutWidth) || 18.0
    const updated = Math.max(0.4, current + delta)
    setFlatOutWidth(updated.toFixed(2))
  }

  const adjustOutThick = (delta: number) => {
    const current = parseFloat(flatOutThick) || 4.5
    const updated = Math.max(0.1, current + delta)
    setFlatOutWidth(updated.toFixed(2))
  }

  return (
    <>
      {/* Left Column: Flat Profiling Inputs */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          document.getElementById('flat-results')?.scrollIntoView({ behavior: 'smooth' });
        }}
        className="lg:col-span-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 space-y-5 font-mono shadow-sm"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <RectangleHorizontal className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                01 FLAT PROFILING INPUTS
              </h3>
              <p className="text-[10px] text-[var(--color-muted)] m-0">
                Rectangular strip, busbar & profile rolling
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[9px] font-bold uppercase tracking-wider">
            FLAT_STRIP
          </span>
        </div>

        <div className="space-y-4">
          {/* Inlet Geometry */}
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3.5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-[var(--color-text)] uppercase tracking-wider">
                Inlet Stock Profile (Raw)
              </span>
              <span className="text-[10px] text-[var(--color-muted)]">Entry Profile</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Width w1 */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider block">
                  Width (w₁)
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => adjustInWidth(-0.5)}
                    className="w-7 h-7 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center transition cursor-pointer"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.01"
                      value={flatInWidth}
                      onChange={(e) => setFlatInWidth(e.target.value)}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-2.5 py-1.5 text-center text-xs font-bold text-[var(--color-text)] focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="absolute right-2 top-2 text-[9px] text-[var(--color-muted)]">mm</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => adjustInWidth(0.5)}
                    className="w-7 h-7 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center transition cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Thickness t1 */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider block">
                  Thickness (t₁)
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => adjustInThick(-0.2)}
                    className="w-7 h-7 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center transition cursor-pointer"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.01"
                      value={flatInThick}
                      onChange={(e) => setFlatInThick(e.target.value)}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-2.5 py-1.5 text-center text-xs font-bold text-[var(--color-text)] focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="absolute right-2 top-2 text-[9px] text-[var(--color-muted)]">mm</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => adjustInThick(0.2)}
                    className="w-7 h-7 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center transition cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Outlet Geometry */}
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3.5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                Outlet Finished Profile
              </span>
              <span className="text-[10px] text-[var(--color-muted)]">Finished Die Size</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Width w2 */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider block">
                  Width (w₂)
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => adjustOutWidth(-0.5)}
                    className="w-7 h-7 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center transition cursor-pointer"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.01"
                      value={flatOutWidth}
                      onChange={(e) => setFlatOutWidth(e.target.value)}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-2.5 py-1.5 text-center text-xs font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="absolute right-2 top-2 text-[9px] text-[var(--color-muted)]">mm</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => adjustOutWidth(0.5)}
                    className="w-7 h-7 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center transition cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Thickness t2 */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider block">
                  Thickness (t₂)
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFlatOutThick((Math.max(0.1, (parseFloat(flatOutThick) || 4.5) - 0.2)).toFixed(2))}
                    className="w-7 h-7 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center transition cursor-pointer"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.01"
                      value={flatOutThick}
                      onChange={(e) => setFlatOutThick(e.target.value)}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-2.5 py-1.5 text-center text-xs font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="absolute right-2 top-2 text-[9px] text-[var(--color-muted)]">mm</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFlatOutThick(((parseFloat(flatOutThick) || 4.5) + 0.2).toFixed(2))}
                    className="w-7 h-7 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center transition cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Right Column: Flat Geometry Telemetry & CAD Blueprint */}
      <div id="flat-results" className="lg:col-span-7 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 flex flex-col justify-between shadow-sm min-h-[500px] font-mono space-y-5">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                02 PROFILE TRANSFORMATION & TELEMETRY
              </h3>
            </div>
            
            <div className="flex items-center gap-1 bg-[var(--color-surface-2)] p-1 rounded-lg border border-[var(--color-border)] text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setViewMode('overlay')}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${
                  viewMode === 'overlay' ? 'bg-emerald-600 text-white' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                Concentric Overlay
              </button>
              <button
                type="button"
                onClick={() => setViewMode('side_by_side')}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${
                  viewMode === 'side_by_side' ? 'bg-emerald-600 text-white' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                Side-by-Side
              </button>
            </div>
          </div>

          {flatResults ? (
            <>
              {/* CAD Geometry Visualizer */}
              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-3 left-4 text-[10px] font-bold text-[var(--color-muted)] tracking-wider flex items-center gap-1.5 uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {viewMode === 'overlay' ? 'Concentric Strip Profile Overlay' : 'Inlet vs Outlet Profile Sizing'}
                </div>

                {(() => {
                  const inValW = parseFloat(flatInWidth) || 20.0
                  const inValT = parseFloat(flatInThick) || 5.0
                  const outValW = parseFloat(flatOutWidth) || 18.0
                  const outValT = parseFloat(flatOutThick) || 4.5

                  const maxDim = Math.max(inValW, inValT, outValW, outValT, 1)
                  const scale = 110 / maxDim

                  const inW = inValW * scale
                  const inH = inValT * scale
                  const outW = outValW * scale
                  const outH = outValT * scale

                  return (
                    <svg className="w-full h-[180px]" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="stripHatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                          <line x1="0" y1="0" x2="0" y2="6" stroke="#10b981" strokeWidth="1" strokeOpacity="0.3" />
                        </pattern>
                      </defs>

                      {/* Center Crosshairs */}
                      <line x1="200" y1="20" x2="200" y2="180" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="50" y1="100" x2="350" y2="100" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3 3" />

                      {viewMode === 'overlay' ? (
                        <>
                          {/* Raw Stock Strip Box */}
                          <rect
                            x={200 - inW / 2}
                            y={100 - inH / 2}
                            width={inW}
                            height={inH}
                            fill="url(#stripHatch)"
                            stroke="#10b981"
                            strokeWidth="1.5"
                            strokeDasharray="4 2"
                            rx="2"
                          />

                          {/* Finished Strip Box */}
                          <rect
                            x={200 - outW / 2}
                            y={100 - outH / 2}
                            width={outW}
                            height={outH}
                            fill="rgba(59, 130, 246, 0.2)"
                            stroke="#3b82f6"
                            strokeWidth="2"
                            rx="2"
                          />

                          {/* Caliper Labels */}
                          <text x="30" y="45" fill="#10b981" fontSize="10" fontFamily="monospace" fontWeight="bold">
                            Inlet: {inValW.toFixed(1)} × {inValT.toFixed(1)} mm ({flatResults.inArea.toFixed(1)} mm²)
                          </text>
                          <text x="370" y="165" fill="#3b82f6" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="end">
                            Outlet: {outValW.toFixed(1)} × {outValT.toFixed(1)} mm ({flatResults.outArea.toFixed(1)} mm²)
                          </text>
                        </>
                      ) : (
                        <>
                          {/* Left: Raw Stock */}
                          <g transform="translate(120, 100)">
                            <rect
                              x={-inW/2}
                              y={-inH/2}
                              width={inW}
                              height={inH}
                              fill="rgba(16, 185, 129, 0.15)"
                              stroke="#10b981"
                              strokeWidth="1.5"
                              rx="2"
                            />
                            <text x="0" y={inH/2 + 18} fill="#10b981" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                              {inValW.toFixed(1)} × {inValT.toFixed(1)} mm
                            </text>
                            <text x="0" y={-inH/2 - 8} fill="#10b981" fontSize="9" fontFamily="monospace" textAnchor="middle">
                              RAW STOCK
                            </text>
                          </g>

                          {/* Right: Finished Strip */}
                          <g transform="translate(280, 100)">
                            <rect
                              x={-outW/2}
                              y={-outH/2}
                              width={outW}
                              height={outH}
                              fill="rgba(59, 130, 246, 0.2)"
                              stroke="#3b82f6"
                              strokeWidth="1.5"
                              rx="2"
                            />
                            <text x="0" y={outH/2 + 18} fill="#3b82f6" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                              {outValW.toFixed(1)} × {outValT.toFixed(1)} mm
                            </text>
                            <text x="0" y={-outH/2 - 8} fill="#3b82f6" fontSize="9" fontFamily="monospace" textAnchor="middle">
                              FINISHED STRIP
                            </text>
                          </g>
                        </>
                      )}
                    </svg>
                  )
                })()}
              </div>

              {/* Yield Safety Margin */}
              {(() => {
                const limit = getMaterialLimit()
                const reduction = flatResults.reduction
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
                          isUnsafe ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, pctOfLimit)}%` }}
                      />
                    </div>
                  </div>
                )
              })()}

              {/* KPI Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                {/* KPI 1: Area Reduction */}
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3.5 rounded-xl">
                  <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block mb-1">
                    Area Reduction
                  </span>
                  <div className="text-lg font-bold font-mono text-emerald-400 tabular-nums">
                    {flatResults.reduction.toFixed(2)}%
                  </div>
                </div>

                {/* KPI 2: Elongation */}
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3.5 rounded-xl">
                  <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block mb-1">
                    Elongation (E)
                  </span>
                  <div className="text-lg font-bold font-mono text-blue-400 tabular-nums">
                    +{flatResults.elongation.toFixed(2)}%
                  </div>
                </div>

                {/* KPI 3: Width Reduction */}
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3.5 rounded-xl">
                  <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block mb-1">
                    Width Draft
                  </span>
                  <div className="text-lg font-bold font-mono text-cyan-400 tabular-nums">
                    {flatResults.widthRed.toFixed(2)}%
                  </div>
                </div>

                {/* KPI 4: Thickness Reduction */}
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3.5 rounded-xl">
                  <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block mb-1">
                    Thickness Draft
                  </span>
                  <div className="text-lg font-bold font-mono text-purple-400 tabular-nums">
                    {flatResults.thickRed.toFixed(2)}%
                  </div>
                </div>

                {/* KPI 5: Inlet Aspect Ratio */}
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3.5 rounded-xl col-span-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--color-muted)] uppercase text-[10px]">Inlet Aspect Ratio (w₁/t₁)</span>
                    <span className="font-bold text-[var(--color-text)] tabular-nums">
                      {flatResults.aspectIn.toFixed(2)}:1
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1 border-t border-[var(--color-border)] pt-1">
                    <span className="text-[var(--color-muted)] uppercase text-[10px]">Inlet Area (A₁)</span>
                    <span className="font-bold text-[var(--color-text)] tabular-nums">
                      {flatResults.inArea.toFixed(2)} mm²
                    </span>
                  </div>
                </div>

                {/* KPI 6: Outlet Aspect Ratio */}
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3.5 rounded-xl col-span-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--color-muted)] uppercase text-[10px]">Outlet Aspect Ratio (w₂/t₂)</span>
                    <span className="font-bold text-blue-400 tabular-nums">
                      {flatResults.aspectOut.toFixed(2)}:1
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1 border-t border-[var(--color-border)] pt-1">
                    <span className="text-[var(--color-muted)] uppercase text-[10px]">Outlet Area (A₂)</span>
                    <span className="font-bold text-blue-400 tabular-nums">
                      {flatResults.outArea.toFixed(2)} mm²
                    </span>
                  </div>
                </div>
              </div>

              {/* Matched Flat Dies in Inventory */}
              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                  <div className="flex items-center gap-2">
                    <Table className="h-4 w-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                      Stock Flat Die Matches ({parseFloat(flatOutWidth).toFixed(2)} × {parseFloat(flatOutThick).toFixed(2)} mm)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => findMatchingFlatDies(999, parseFloat(flatOutWidth), parseFloat(flatOutThick))}
                    disabled={loadingDies[999]}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer disabled:opacity-50 uppercase"
                  >
                    {loadingDies[999] ? 'Searching...' : 'Scan Stock'}
                  </button>
                </div>

                {matchingDies[999] ? (
                  <div className="space-y-2">
                    {matchingDies[999].length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {matchingDies[999].map((die) => (
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
                            <div className="text-[10px] text-[var(--color-muted)]">
                              Size: {parseFloat(die.width || 0).toFixed(2)} × {parseFloat(die.thickness || 0).toFixed(2)} mm
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--color-muted)] m-0 text-center py-2">
                        No active flat stock dies found matching these dimensions.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-muted)] m-0">
                    Click <strong>Scan Stock</strong> to query live warehouse inventory for flat profile dies.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl py-16 px-4 flex flex-col items-center justify-center text-center space-y-3">
              <div className={`p-3 rounded-xl border ${flatValidationError ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-muted)]'}`}>
                {flatValidationError ? <AlertTriangle className="h-6 w-6" /> : <Info className="h-6 w-6" />}
              </div>
              <div className="space-y-1 max-w-md">
                <h4 className={`text-sm font-bold uppercase ${flatValidationError ? 'text-amber-400' : 'text-[var(--color-text)]'}`}>
                  {flatValidationError ? 'Invalid Flat Profile Parameters' : 'Awaiting Parameters'}
                </h4>
                <p className="text-xs text-[var(--color-muted)]">
                  {flatValidationError || 'Enter rectangular dimensions in the left panel to calculate width & thickness draft reductions.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
