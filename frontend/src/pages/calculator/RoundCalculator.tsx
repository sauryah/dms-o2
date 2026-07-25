import React from 'react'
import { Calculator, Sliders, TrendingDown, Maximize2, ArrowRight, Table, Info, AlertTriangle, Zap } from 'lucide-react'

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
  
  // Physics helpers
  getDrawingStress: (inArea: number, outArea: number, alphaRad: number) => number
  
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
  drawSpeed,
  dieAngle,
  yieldStrength,
  uts,
  mu,
  materialType,
  getDrawingStress,
  matchingDies,
  loadingDies,
  findMatchingDies,
  getMaterialLimit,
}: RoundCalculatorProps) {
  return (
    <>
      {/* Inputs Panel */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          document.getElementById('calculation-results')?.scrollIntoView({ behavior: 'smooth' });
        }}
        className="lg:col-span-5 bg-[#0D1325] border border-[#1b253b] rounded-2xl p-6 space-y-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[#1b253b] pb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
              Process Variables
            </h3>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-mono uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Live
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">TAB_1 // ROUND_DIE</span>
        </div>
        
        {/* Custom Sizing Mode selector */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
            Sizing Mode
          </label>
          <div className="flex flex-col rounded-xl overflow-hidden border border-[#1b253b] divide-y divide-[#1b253b]">
            <button
              type="button"
              onClick={() => setRoundCalcMode('forward')}
              className={`w-full text-left p-3.5 flex items-start gap-3 transition-premium ${
                roundCalcMode === 'forward' 
                  ? 'bg-[#121A2F] border-l-[3px] border-l-blue-500 text-blue-400' 
                  : 'bg-[#0D1325] border-l-[3px] border-l-transparent text-slate-400 hover:bg-[#121A2F]/50'
              }`}
            >
              <div className={`p-1.5 rounded bg-blue-500/10 mt-0.5 ${roundCalcMode === 'forward' ? 'text-blue-400' : 'text-slate-500'}`}>
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold block text-slate-200">Forward Sizing Analysis</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block leading-normal">Given raw and sized wire diameters, compute reduction draft & elongation values.</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRoundCalcMode('backward_red')}
              className={`w-full text-left p-3.5 flex items-start gap-3 transition-premium ${
                roundCalcMode === 'backward_red' 
                  ? 'bg-[#121A2F] border-l-[3px] border-l-blue-500 text-blue-400' 
                  : 'bg-[#0D1325] border-l-[3px] border-l-transparent text-slate-400 hover:bg-[#121A2F]/50'
              }`}
            >
              <div className={`p-1.5 rounded bg-cyan-500/10 mt-0.5 ${roundCalcMode === 'backward_red' ? 'text-cyan-400' : 'text-slate-500'}`}>
                <TrendingDown className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold block text-slate-200">Target Reduction Limit</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block leading-normal">Given inlet diameter & desired reduction %, calculate the required die sizing.</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRoundCalcMode('backward_elong')}
              className={`w-full text-left p-3.5 flex items-start gap-3 transition-premium ${
                roundCalcMode === 'backward_elong' 
                  ? 'bg-[#121A2F] border-l-[3px] border-l-blue-500 text-blue-400' 
                  : 'bg-[#0D1325] border-l-[3px] border-l-transparent text-slate-400 hover:bg-[#121A2F]/50'
              }`}
            >
              <div className={`p-1.5 rounded bg-purple-500/10 mt-0.5 ${roundCalcMode === 'backward_elong' ? 'text-purple-400' : 'text-slate-500'}`}>
                <Maximize2 className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold block text-slate-200">Target Elongation Ratio</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block leading-normal">Given inlet diameter & target elongation %, compute the finished wire thickness.</span>
              </div>
            </button>
          </div>
        </div>

        {/* Input Fields */}
        <div className="space-y-4 pt-4 border-t border-[#1b253b]">
          {/* Inlet Diameter Input */}
          <div>
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2">
              Inlet Diameter (d₁)
            </label>
            <div className="relative rounded-xl shadow-sm">
              <input 
                type="number" 
                step="0.01" 
                value={roundInlet}
                onChange={(e) => setRoundInlet(e.target.value)}
                className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-4 py-3.5 pr-16 text-white font-mono text-sm focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-premium"
              />
              <div className="absolute right-3 top-2.5 px-2.5 py-1 bg-[#121A2F] border border-[#2b3a61]/40 rounded-lg text-slate-400 text-xs font-mono font-bold uppercase tracking-wider shadow-inner">
                mm
              </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-1.5 block">Starting stock/wire cross-section size.</span>
          </div>

          {/* Mode-specific Input */}
          {roundCalcMode === 'forward' && (
            <div>
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2">
                Outlet Diameter (d₂)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input 
                  type="number" 
                  step="0.01" 
                  value={roundOutlet}
                  onChange={(e) => setRoundOutlet(e.target.value)}
                  className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-4 py-3.5 pr-16 text-white font-mono text-sm focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-premium"
                />
                <div className="absolute right-3 top-2.5 px-2.5 py-1 bg-[#121A2F] border border-[#2b3a61]/40 rounded-lg text-slate-400 text-xs font-mono font-bold uppercase tracking-wider shadow-inner">
                  mm
                </div>
              </div>
              <span className="text-[10px] text-slate-500 mt-1.5 block">Desired sizing diameter. Must be less than inlet diameter (d₁).</span>
            </div>
          )}

          {roundCalcMode === 'backward_red' && (
            <div>
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2">
                Target Area Reduction (R)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input 
                  type="number" 
                  step="0.1" 
                  value={roundTargetRed}
                  onChange={(e) => setRoundTargetRed(e.target.value)}
                  className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-4 py-3.5 pr-14 text-white font-mono text-sm focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-premium"
                />
                <div className="absolute right-3 top-2.5 px-2.5 py-1 bg-[#121A2F] border border-[#2b3a61]/40 rounded-lg text-slate-400 text-xs font-mono font-bold uppercase tracking-wider shadow-inner">
                  %
                </div>
              </div>
              <span className="text-[10px] text-slate-500 mt-1.5 block">Area reduction limit target. Industrial wire draws target 15% - 25% per pass.</span>
            </div>
          )}

          {roundCalcMode === 'backward_elong' && (
            <div>
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2">
                Target Elongation (E)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input 
                  type="number" 
                  step="0.1" 
                  value={roundTargetElong}
                  onChange={(e) => setRoundTargetElong(e.target.value)}
                  className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-4 py-3.5 pr-14 text-white font-mono text-sm focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-premium"
                />
                <div className="absolute right-3 top-2.5 px-2.5 py-1 bg-[#121A2F] border border-[#2b3a61]/40 rounded-lg text-slate-400 text-xs font-mono font-bold uppercase tracking-wider shadow-inner">
                  %
                </div>
              </div>
              <span className="text-[10px] text-slate-500 mt-1.5 block">Relative extension strain target percentage.</span>
            </div>
          )}
          
          <button
            type="submit"
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-300 shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 mt-4 hover:-translate-y-0.5"
          >
            <Calculator className="h-4.5 w-4.5" />
            Calculate & View Results
          </button>
        </div>
      </form>

      {/* Outputs Column */}
      <div id="calculation-results" className="lg:col-span-7 bg-[#0D1325] border border-[#1b253b] rounded-2xl p-6 flex flex-col justify-between shadow-xl min-h-[580px]">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#1b253b] pb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
              Deformation Graphic & KPI Summary
            </h3>
            <span className="text-[10px] font-mono text-slate-500">SCHEMA // OUTPUT_PREVIEW</span>
          </div>

          {roundResults ? (
            <>
              {/* Live SVG CAD Draw Schematic */}
              <div className="bg-[#050816] border border-[#1b253b] rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden shadow-inner blueprint-grid">
                <div className="absolute top-3 left-4 text-[9px] font-mono text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  2D Wire Die Profile Schematic
                </div>

                {/* Rendering dynamic SVG */}
                {(() => {
                  const inletVal = parseFloat(roundInlet) || 8.00
                  const outletVal = roundResults.outlet
                  const maxVal = Math.max(inletVal, outletVal, 1)
                  const scale = 70 / maxVal

                  const inletHeight = inletVal * scale
                  const outletHeight = outletVal * scale
                  const inletY = 100 - (inletHeight / 2)
                  const outletY = 100 - (outletHeight / 2)

                  const drawingRatio = roundResults.elongationRatio
                  const animDur = Math.max(0.1, Math.min(3, 2.5 / drawingRatio))

                  return (
                    <svg className="w-full h-[180px]" viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="dieHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                          <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(59, 130, 246, 0.16)" strokeWidth="1.2" />
                        </pattern>
                        <linearGradient id="metalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#1e293b" />
                          <stop offset="25%" stopColor="#3b4b61" />
                          <stop offset="50%" stopColor="#64748b" />
                          <stop offset="75%" stopColor="#3b4b61" />
                          <stop offset="100%" stopColor="#1e293b" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Center line (neutral axis) */}
                      <line x1="15" y1="100" x2="485" y2="100" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="1" strokeDasharray="5 3" />

                      {/* Wire Body */}
                      <path 
                        d={`M 20,${inletY} 
                           L 220,${inletY} 
                           L 280,${outletY} 
                           L 480,${outletY} 
                           L 480,${outletY + outletHeight} 
                           L 280,${outletY + outletHeight} 
                           L 220,${inletY + inletHeight} 
                           L 20,${inletY + inletHeight} Z`}
                        fill="url(#metalGrad)"
                        stroke="rgba(99, 102, 241, 0.3)"
                        strokeWidth="1.5"
                      />

                      {/* Top Die Piece */}
                      <path 
                        d={`M 210,15 
                           L 290,15 
                           L 290,${outletY - 2} 
                           L 280,${outletY - 2} 
                           L 220,${inletY - 2} 
                           L 210,${inletY - 2} Z`}
                        fill="#121A2F"
                        stroke="rgba(59, 130, 246, 0.7)"
                        strokeWidth="1.5"
                      />
                      <path 
                        d={`M 210,15 
                           L 290,15 
                           L 290,${outletY - 2} 
                           L 280,${outletY - 2} 
                           L 220,${inletY - 2} 
                           L 210,${inletY - 2} Z`}
                        fill="url(#dieHatch)"
                      />

                      {/* Bottom Die Piece */}
                      <path 
                        d={`M 210,185 
                           L 290,185 
                           L 290,${outletY + outletHeight + 2} 
                           L 280,${outletY + outletHeight + 2} 
                           L 220,${inletY + inletHeight + 2} 
                           L 210,${inletY + inletHeight + 2} Z`}
                        fill="#121A2F"
                        stroke="rgba(59, 130, 246, 0.7)"
                        strokeWidth="1.5"
                      />
                      <path 
                        d={`M 210,185 
                           L 290,185 
                           L 290,${outletY + outletHeight + 2} 
                           L 280,${outletY + outletHeight + 2} 
                           L 220,${inletY + inletHeight + 2} 
                           L 210,${inletY + inletHeight + 2} Z`}
                        fill="url(#dieHatch)"
                      />

                      {/* Flow indicators (speeds differ based on Drawing Ratio) */}
                      <path 
                        d={`M 30,100 L 210,100`}
                        stroke="rgba(6, 182, 212, 0.55)"
                        strokeWidth="2.5"
                        strokeDasharray="5 18"
                        strokeLinecap="round"
                      >
                        <animate attributeName="stroke-dashoffset" values="46;0" dur="2.2s" repeatCount="indefinite" />
                      </path>

                      <path 
                        d={`M 290,100 L 470,100`}
                        stroke="rgba(168, 85, 247, 0.65)"
                        strokeWidth="2.5"
                        strokeDasharray="5 18"
                        strokeLinecap="round"
                      >
                        <animate attributeName="stroke-dashoffset" values="46;0" dur={`${animDur}s`} repeatCount="indefinite" />
                      </path>

                      {/* Dimension Lines (Inlet) */}
                      <line x1="32" y1={inletY} x2="32" y2={inletY + inletHeight} stroke="#3b82f6" strokeWidth="1.2" />
                      <polygon points={`32,${inletY} 29,${inletY + 6} 35,${inletY + 6}`} fill="#3b82f6" />
                      <polygon points={`32,${inletY + inletHeight} 29,${inletY + inletHeight - 6} 35,${inletY + inletHeight - 6}`} fill="#3b82f6" />
                      <line x1="18" y1={inletY} x2="38" y2={inletY} stroke="rgba(99, 102, 241, 0.25)" strokeWidth="1" />
                      <line x1="18" y1={inletY + inletHeight} x2="38" y2={inletY + inletHeight} stroke="rgba(99, 102, 241, 0.25)" strokeWidth="1" />

                      {/* Dimension Lines (Outlet) */}
                      <line x1="468" y1={outletY} x2="468" y2={outletY + outletHeight} stroke="#a855f7" strokeWidth="1.2" />
                      <polygon points={`468,${outletY} 465,${outletY + 6} 471,${outletY + 6}`} fill="#a855f7" />
                      <polygon points={`468,${outletY + outletHeight} 465,${outletY + outletHeight - 6} 471,${outletY + outletHeight - 6}`} fill="#a855f7" />
                      <line x1="462" y1={outletY} x2="482" y2={outletY} stroke="rgba(168, 85, 247, 0.25)" strokeWidth="1" />
                      <line x1="462" y1={outletY + outletHeight} x2="482" y2={outletY + outletHeight} stroke="rgba(168, 85, 247, 0.25)" strokeWidth="1" />

                      {/* Labels */}
                      <text x="42" y="104" fill="#3b82f6" fontSize="10" fontFamily="Fira Code, monospace" fontWeight="600">
                        d₁:{inletVal.toFixed(2)}mm
                      </text>
                      <text x="408" y="104" fill="#a855f7" fontSize="10" fontFamily="Fira Code, monospace" fontWeight="600" textAnchor="end">
                        d₂:{outletVal.toFixed(3)}mm
                      </text>

                      {/* Speed multiplier node */}
                      <g transform="translate(250, 100)">
                        <circle r="15" fill="#0D1325" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="1" />
                        <path d="M-4,-4 L2,0 L-4,4" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M1,-4 L7,0 L1,4" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
                      </g>
                      <text x="250" y="125" fill="#06b6d4" fontSize="8" fontFamily="Fira Code, monospace" fontWeight="600" textAnchor="middle" letterSpacing="0.5">
                        v₂/v₁ = {drawingRatio.toFixed(3)}
                      </text>
                    </svg>
                  )
                })()}
              </div>

              {/* Material Yield Verification Message */}
              {(() => {
                const limit = getMaterialLimit()
                const isUnsafe = roundResults.reduction > limit
                return (
                  <div className="animate-fadeIn">
                    {isUnsafe ? (
                      <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start gap-3 text-rose-400 shadow-inner">
                        <Info className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold block uppercase tracking-wider">Warning: Material Yield Limit Exceeded</span>
                          <p className="text-[11px] text-rose-300 leading-normal mt-1">
                            Calculated area reduction (<span className="font-mono font-bold">{roundResults.reduction.toFixed(2)}%</span>) exceeds the safe limit of <span className="font-mono font-bold">{limit}%</span> for the selected stock material. High risk of tensile wire breakage, line slippage, or heat damage.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 flex items-start gap-3 text-emerald-400 shadow-inner">
                        <Info className="h-5 w-5 shrink-0 mt-0.5 text-emerald-500" />
                        <div>
                          <span className="text-xs font-bold block uppercase tracking-wider text-emerald-300">Draft Sizing Verified</span>
                          <p className="text-[11px] text-emerald-300 leading-normal mt-1">
                            Sizing is within safe limits for drawing (<span className="font-mono font-bold">{roundResults.reduction.toFixed(2)}%</span> vs <span className="font-mono font-bold">{limit}%</span> max limit). Physical flow velocity is optimized.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* KPI Metric Readouts */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* KPI 1: outlet size */}
                <div className="bg-[#121A2F] border border-[#1b253b] p-4.5 rounded-xl transition-premium hover:border-blue-500/30 shadow-inner group">
                  <span className="text-[10px] text-slate-400 font-heading font-semibold uppercase tracking-wider block mb-1">
                    Outlet Size (d₂)
                  </span>
                  <div className="text-2xl font-bold font-mono text-white tracking-tight flex items-baseline gap-1">
                    {roundResults.outlet.toFixed(3)}
                    <span className="text-[10px] font-sans font-normal text-slate-500 uppercase tracking-widest">mm</span>
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 block">Exit wire sizing diameter.</span>
                </div>

                {/* KPI 2: area reduction */}
                <div className="bg-[#121A2F] border border-[#1b253b] p-4.5 rounded-xl transition-premium hover:border-cyan-500/30 shadow-inner group">
                  <span className="text-[10px] text-slate-400 font-heading font-semibold uppercase tracking-wider block mb-1">
                    Area Reduction (R)
                  </span>
                  <div className="text-2xl font-bold font-mono text-cyan-400 tracking-tight">
                    {roundResults.reduction.toFixed(2)}%
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 block">Draft cross-section reduction.</span>
                </div>

                {/* KPI 3: elongation */}
                <div className="bg-[#121A2F] border border-[#1b253b] p-4.5 rounded-xl transition-premium hover:border-purple-500/30 shadow-inner group">
                  <span className="text-[10px] text-slate-400 font-heading font-semibold uppercase tracking-wider block mb-1">
                    Elongation (E)
                  </span>
                  <div className="text-2xl font-bold font-mono text-purple-400 tracking-tight">
                    {roundResults.elongation.toFixed(2)}%
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 block">Relative length expansion.</span>
                </div>

                {/* KPI 4: drawing ratio */}
                <div className="bg-[#121A2F] border border-[#1b253b] p-4.5 rounded-xl transition-premium hover:border-emerald-500/30 shadow-inner group">
                  <span className="text-[10px] text-slate-400 font-heading font-semibold uppercase tracking-wider block mb-1">
                    Drawing Ratio (λ)
                  </span>
                  <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight flex items-baseline gap-0.5">
                    {roundResults.elongationRatio.toFixed(3)}
                    <span className="text-[10px] font-sans font-normal text-slate-500">x</span>
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 block">Length & speed coefficient.</span>
                </div>

                {/* KPI 5: initial area */}
                <div className="bg-[#121A2F] border border-[#1b253b] p-4.5 rounded-xl transition-premium shadow-inner">
                  <span className="text-[10px] text-slate-400 font-heading font-semibold uppercase tracking-wider block mb-1">
                    Inlet Area (A₁)
                  </span>
                  <div className="text-sm font-bold font-mono text-slate-300">
                    {roundResults.inArea.toFixed(3)} <span className="text-[10px] text-slate-500">mm²</span>
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 block">Input stock cross-section.</span>
                </div>

                {/* KPI 6: final area */}
                <div className="bg-[#121A2F] border border-[#1b253b] p-4.5 rounded-xl transition-premium shadow-inner">
                  <span className="text-[10px] text-slate-400 font-heading font-semibold uppercase tracking-wider block mb-1">
                    Outlet Area (A₂)
                  </span>
                  <div className="text-sm font-bold font-mono text-slate-300">
                    {roundResults.outArea.toFixed(3)} <span className="text-[10px] text-slate-500">mm²</span>
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 block">Outlet sized cross-section.</span>
                </div>

                {/* Secondary stats summary */}
                <div className="bg-[#121A2F] border border-[#1b253b] p-4 rounded-xl col-span-2 md:col-span-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-slate-400">
                    <div>
                      Diameter Ratio: <span className="font-semibold text-white">d₁/d₂ = {roundResults.diameterRatio.toFixed(3)}</span>
                    </div>
                    <div className="hidden sm:block text-slate-600">|</div>
                    <div>
                      Linear Sizing Factor: <span className="font-semibold text-white">d₂/d₁ = {(1 / roundResults.diameterRatio).toFixed(3)}</span>
                    </div>
                    <div className="hidden sm:block text-slate-600">|</div>
                    <div>
                      Velocity Output: <span className="font-semibold text-emerald-450">v₂ = {roundResults.elongationRatio.toFixed(3)} × v₁</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Round Drawing Physics & Die Match Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-[#121A2F]/90 border border-[#1b253b] p-5 rounded-xl space-y-3 shadow-inner">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-heading flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Mechanical Tension & Power
                  </h4>
                   {(() => {
                    const alphaRad = (parseFloat(dieAngle) * Math.PI) / 180
                    const sigmaD = getDrawingStress(roundResults.inArea, roundResults.outArea, alphaRad)
                    const forceN = roundResults.outArea * sigmaD
                    const powerKw = (forceN * parseFloat(drawSpeed)) / 1000
                    const isStressUnsafe = sigmaD >= 0.6 * parseFloat(uts)
                    
                    const epsilon = Math.log(roundResults.inArea / roundResults.outArea)
                    const optAlphaRad = Math.sqrt(1.5 * mu * epsilon)
                    const optAlphaDeg = optAlphaRad * (180 / Math.PI)

                    return (
                      <div className="space-y-2.5 font-mono text-xs text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-400 uppercase text-[9px] font-heading font-bold">Drawing Force:</span>
                          <span className="font-bold text-white">{forceN.toFixed(0)} N</span>
                        </div>
                        <div className="flex justify-between border-t border-[#1b253b]/55 pt-2">
                          <span className="text-slate-400 uppercase text-[9px] font-heading font-bold">Drawing Stress:</span>
                          <span className={`font-bold ${isStressUnsafe ? 'text-rose-400' : 'text-indigo-400'}`}>
                            {sigmaD.toFixed(1)} MPa {isStressUnsafe && '(Tension Limit)'}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-[#1b253b]/55 pt-2">
                          <span className="text-slate-400 uppercase text-[9px] font-heading font-bold">Power Required:</span>
                          <span className="font-bold text-emerald-400">{powerKw.toFixed(2)} kW</span>
                        </div>
                        <div className="flex justify-between border-t border-[#1b253b]/55 pt-2">
                          <span className="text-slate-400 uppercase text-[9px] font-heading font-bold">Optimum Die Angle:</span>
                          <span className="font-bold text-cyan-400">{optAlphaDeg.toFixed(1)}° (semi)</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                <div className="bg-[#121A2F]/90 border border-[#1b253b] p-5 rounded-xl space-y-3 shadow-inner">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-heading flex items-center gap-1.5">
                    <Table className="h-4 w-4 text-blue-500" />
                    Matched Round Dies in Inventory
                  </h4>
                  
                  {matchingDies[888] ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {matchingDies[888].length > 0 ? (
                        matchingDies[888].map(die => (
                          <a
                            key={die.die_id}
                            href={`#/dies/${die.die_id}`}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold border transition ${
                              die.status === 'AVAILABLE'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                            }`}
                          >
                            {die.die_id} ({parseFloat(die.current_size).toFixed(3)}mm)
                          </a>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 font-mono">No matching round dies in inventory</span>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => findMatchingDies(888, roundResults.outlet)}
                      disabled={loadingDies[888]}
                      className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs font-bold rounded-xl border border-blue-600/30 transition flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {loadingDies[888] ? 'Searching...' : 'Scan Inventory for Matching Dies'}
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[#050816] border border-[#1b253b] rounded-2xl py-16 px-6 flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${roundValidationError ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-slate-900 border border-[#1b253b] text-slate-500'}`}>
                {roundValidationError ? <AlertTriangle className="h-6 w-6" /> : <Info className="h-6 w-6" />}
              </div>
              <div className="space-y-1 max-w-md">
                <h4 className={`text-sm font-bold ${roundValidationError ? 'text-amber-300' : 'text-slate-300'}`}>
                  {roundValidationError ? 'Invalid Sizing Parameters' : 'Waiting for Sizing Parameters'}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {roundValidationError || 'Please enter valid numeric input diameters and targets in the configurator panel to compute deformation stats.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {roundResults && (
          <div className="mt-8 border-t border-[#1b253b] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500/80" />
              MASS BALANCE PRESERVED: A₁L₁ = A₂L₂
            </span>
            <span>ROUNDED TO 3 DECIMAL PLACES</span>
          </div>
        )}
      </div>
    </>
  )
}
