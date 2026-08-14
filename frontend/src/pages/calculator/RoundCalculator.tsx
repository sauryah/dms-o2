import { Calculator, Sliders, TrendingDown, Maximize2, Table, Info, AlertTriangle, Zap } from 'lucide-react'

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
  return (
    <>
      {/* Inputs Panel */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          document.getElementById('calculation-results')?.scrollIntoView({ behavior: 'smooth' });
        }}
        className="lg:col-span-5 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 space-y-4 font-mono"
      >
        <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-bold text-[#e4e4e4] uppercase tracking-wider">
              01 PROCESS VARIABLES
            </h3>
            <span className="px-1.5 py-0.2 rounded-sm bg-[#141414] text-blue-400 border border-blue-500/30 text-[9px] font-mono uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              LIVE
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#6b7280]">ROUND_DIE</span>
        </div>
        
        {/* Custom Sizing Mode selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block">
            Sizing Mode
          </label>
          <div className="flex flex-col rounded-sm overflow-hidden border border-[#2a2a2a] divide-y divide-[#1a1a1a]">
            <button
              type="button"
              onClick={() => setRoundCalcMode('forward')}
              className={`w-full text-left p-2.5 flex items-start gap-2.5 transition cursor-pointer font-mono ${
                roundCalcMode === 'forward' 
                  ? 'bg-[#141414] border-l-2 border-l-blue-500 text-blue-400' 
                  : 'bg-[#0a0a0a] border-l-2 border-l-transparent text-[#6b7280] hover:bg-[#141414]'
              }`}
            >
              <div className={`p-1 rounded-sm bg-[#141414] mt-0.5 ${roundCalcMode === 'forward' ? 'text-blue-400' : 'text-[#6b7280]'}`}>
                <Sliders className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="text-xs font-bold block text-[#e4e4e4] uppercase">Forward Sizing Analysis</span>
                <span className="text-[10px] text-[#6b7280] mt-0.5 block leading-tight">Given d₁ and d₂, calculate draft & elongation.</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRoundCalcMode('backward_red')}
              className={`w-full text-left p-2.5 flex items-start gap-2.5 transition cursor-pointer font-mono ${
                roundCalcMode === 'backward_red' 
                  ? 'bg-[#141414] border-l-2 border-l-blue-500 text-blue-400' 
                  : 'bg-[#0a0a0a] border-l-2 border-l-transparent text-[#6b7280] hover:bg-[#141414]'
              }`}
            >
              <div className={`p-1 rounded-sm bg-[#141414] mt-0.5 ${roundCalcMode === 'backward_red' ? 'text-cyan-400' : 'text-[#6b7280]'}`}>
                <TrendingDown className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="text-xs font-bold block text-[#e4e4e4] uppercase">Target Reduction Limit</span>
                <span className="text-[10px] text-[#6b7280] mt-0.5 block leading-tight">Given d₁ & reduction %, calculate die sizing.</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRoundCalcMode('backward_elong')}
              className={`w-full text-left p-2.5 flex items-start gap-2.5 transition cursor-pointer font-mono ${
                roundCalcMode === 'backward_elong' 
                  ? 'bg-[#141414] border-l-2 border-l-blue-500 text-blue-400' 
                  : 'bg-[#0a0a0a] border-l-2 border-l-transparent text-[#6b7280] hover:bg-[#141414]'
              }`}
            >
              <div className={`p-1 rounded-sm bg-[#141414] mt-0.5 ${roundCalcMode === 'backward_elong' ? 'text-purple-400' : 'text-[#6b7280]'}`}>
                <Maximize2 className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="text-xs font-bold block text-[#e4e4e4] uppercase">Target Elongation Ratio</span>
                <span className="text-[10px] text-[#6b7280] mt-0.5 block leading-tight">Given d₁ & elongation %, compute thickness.</span>
              </div>
            </button>
          </div>
        </div>

        {/* Input Fields */}
        <div className="space-y-3 pt-3 border-t border-[#1a1a1a]">
          {/* Inlet Diameter Input */}
          <div>
            <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
              Inlet Diameter (d₁)
            </label>
            <div className="relative rounded-sm">
              <input 
                type="number" 
                step="0.01" 
                value={roundInlet}
                onChange={(e) => setRoundInlet(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-3 py-2 pr-12 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
              />
              <div className="absolute right-2 top-1.5 text-[#6b7280] text-[10px] font-mono font-bold uppercase">
                mm
              </div>
            </div>
          </div>

          {/* Mode-specific Input */}
          {roundCalcMode === 'forward' && (
            <div>
              <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
                Outlet Diameter (d₂)
              </label>
              <div className="relative rounded-sm">
                <input 
                  type="number" 
                  step="0.01" 
                  value={roundOutlet}
                  onChange={(e) => setRoundOutlet(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-3 py-2 pr-12 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
                />
                <div className="absolute right-2 top-1.5 text-[#6b7280] text-[10px] font-mono font-bold uppercase">
                  mm
                </div>
              </div>
            </div>
          )}

          {roundCalcMode === 'backward_red' && (
            <div>
              <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
                Target Area Reduction (R)
              </label>
              <div className="relative rounded-sm">
                <input 
                  type="number" 
                  step="0.1" 
                  value={roundTargetRed}
                  onChange={(e) => setRoundTargetRed(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-3 py-2 pr-10 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
                />
                <div className="absolute right-2 top-1.5 text-[#6b7280] text-[10px] font-mono font-bold uppercase">
                  %
                </div>
              </div>
            </div>
          )}

          {roundCalcMode === 'backward_elong' && (
            <div>
              <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
                Target Elongation (E)
              </label>
              <div className="relative rounded-sm">
                <input 
                  type="number" 
                  step="0.1" 
                  value={roundTargetElong}
                  onChange={(e) => setRoundTargetElong(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-3 py-2 pr-10 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
                />
                <div className="absolute right-2 top-1.5 text-[#6b7280] text-[10px] font-mono font-bold uppercase">
                  %
                </div>
              </div>
            </div>
          )}
          
          <button
            type="submit"
            className="w-full py-2.5 bg-[#141414] hover:bg-[#1f1f1f] border border-blue-500/50 text-blue-400 hover:text-blue-300 font-bold text-xs uppercase tracking-wider rounded-sm transition flex items-center justify-center gap-1.5 mt-3 cursor-pointer"
          >
            <Calculator className="h-3.5 w-3.5" />
            Calculate & View Results
          </button>
        </div>
      </form>

      {/* Outputs Column */}
      <div id="calculation-results" className="lg:col-span-7 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 flex flex-col justify-between shadow-2xl min-h-[500px] font-mono">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
            <h3 className="text-xs font-bold text-[#e4e4e4] uppercase tracking-wider">
              02 DEFORMATION GRAPHIC & KPI SUMMARY
            </h3>
            <span className="text-[10px] font-mono text-[#6b7280]">OUTPUT_PREVIEW</span>
          </div>

          {roundResults ? (
            <>
              {/* Live SVG CAD Draw Schematic */}
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm p-3 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-2 left-3 text-[9px] font-mono text-[#6b7280] tracking-wider flex items-center gap-1 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  2D WIRE DIE SCHEMATIC
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
                    <svg className="w-full h-[160px]" viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="dieHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                          <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(59, 130, 246, 0.16)" strokeWidth="1.2" />
                        </pattern>
                        <linearGradient id="metalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#141414" />
                          <stop offset="50%" stopColor="#2a2a2a" />
                          <stop offset="100%" stopColor="#141414" />
                        </linearGradient>
                      </defs>

                      {/* Center line */}
                      <line x1="15" y1="100" x2="485" y2="100" stroke="#2a2a2a" strokeWidth="1" strokeDasharray="5 3" />

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
                        stroke="#3b82f6"
                        strokeWidth="1"
                      />

                      {/* Top Die Piece */}
                      <path 
                        d={`M 210,15 
                           L 290,15 
                           L 290,${outletY - 2} 
                           L 280,${outletY - 2} 
                           L 220,${inletY - 2} 
                           L 210,${inletY - 2} Z`}
                        fill="#141414"
                        stroke="#2a2a2a"
                        strokeWidth="1.5"
                      />

                      {/* Bottom Die Piece */}
                      <path 
                        d={`M 210,185 
                           L 290,185 
                           L 290,${outletY + outletHeight + 2} 
                           L 280,${outletY + outletHeight + 2} 
                           L 220,${inletY + inletHeight + 2} 
                           L 210,${inletY + inletHeight + 2} Z`}
                        fill="#141414"
                        stroke="#2a2a2a"
                        strokeWidth="1.5"
                      />

                      {/* Dimension Lines (Inlet) */}
                      <line x1="32" y1={inletY} x2="32" y2={inletY + inletHeight} stroke="#3b82f6" strokeWidth="1.2" />
                      <line x1="468" y1={outletY} x2="468" y2={outletY + outletHeight} stroke="#a855f7" strokeWidth="1.2" />

                      {/* Labels */}
                      <text x="42" y="104" fill="#3b82f6" fontSize="10" fontFamily="monospace" fontWeight="600">
                        d₁:{inletVal.toFixed(2)}mm
                      </text>
                      <text x="408" y="104" fill="#a855f7" fontSize="10" fontFamily="monospace" fontWeight="600" textAnchor="end">
                        d₂:{outletVal.toFixed(3)}mm
                      </text>

                      {/* Speed multiplier node */}
                      <text x="250" y="125" fill="#06b6d4" fontSize="9" fontFamily="monospace" fontWeight="600" textAnchor="middle">
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
                      <div className="bg-[#141414] border border-red-500/30 rounded-sm p-3 flex items-start gap-2 text-red-400">
                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold block uppercase">WARNING: YIELD LIMIT EXCEEDED</span>
                          <p className="text-[11px] text-red-300 leading-tight mt-0.5">
                            Area reduction ({roundResults.reduction.toFixed(2)}%) exceeds safe threshold ({limit}%).
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#141414] border border-emerald-500/30 rounded-sm p-3 flex items-start gap-2 text-emerald-400">
                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold block uppercase">DRAFT SIZING VERIFIED</span>
                          <p className="text-[11px] text-emerald-300 leading-tight mt-0.5">
                            Reduction ({roundResults.reduction.toFixed(2)}%) within allowable range ({limit}% max limit).
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* KPI Metric Readouts */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-mono">
                {/* KPI 1: outlet size */}
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm">
                  <span className="text-[10px] text-[#6b7280] uppercase tracking-wider block mb-1">
                    Outlet Size (d₂)
                  </span>
                  <div className="text-xl font-bold font-mono text-[#e4e4e4] tabular-nums">
                    {roundResults.outlet.toFixed(3)} <span className="text-xs text-[#6b7280]">mm</span>
                  </div>
                </div>

                {/* KPI 2: area reduction */}
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm">
                  <span className="text-[10px] text-[#6b7280] uppercase tracking-wider block mb-1">
                    Area Reduction (R)
                  </span>
                  <div className="text-xl font-bold font-mono text-cyan-400 tabular-nums">
                    {roundResults.reduction.toFixed(2)}%
                  </div>
                </div>

                {/* KPI 3: elongation */}
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm">
                  <span className="text-[10px] text-[#6b7280] uppercase tracking-wider block mb-1">
                    Elongation (E)
                  </span>
                  <div className="text-xl font-bold font-mono text-purple-400 tabular-nums">
                    {roundResults.elongation.toFixed(2)}%
                  </div>
                </div>

                {/* KPI 4: drawing ratio */}
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm">
                  <span className="text-[10px] text-[#6b7280] uppercase tracking-wider block mb-1">
                    Drawing Ratio (λ)
                  </span>
                  <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                    {roundResults.elongationRatio.toFixed(3)}x
                  </div>
                </div>

                {/* KPI 5: initial area */}
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm">
                  <span className="text-[10px] text-[#6b7280] uppercase tracking-wider block mb-1">
                    Inlet Area (A₁)
                  </span>
                  <div className="text-xs font-bold font-mono text-[#e4e4e4] tabular-nums">
                    {roundResults.inArea.toFixed(3)} <span className="text-[#6b7280]">mm²</span>
                  </div>
                </div>

                {/* KPI 6: final area */}
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm">
                  <span className="text-[10px] text-[#6b7280] uppercase tracking-wider block mb-1">
                    Outlet Area (A₂)
                  </span>
                  <div className="text-xs font-bold font-mono text-[#e4e4e4] tabular-nums">
                    {roundResults.outArea.toFixed(3)} <span className="text-[#6b7280]">mm²</span>
                  </div>
                </div>
              </div>

              {/* Round Drawing Physics & Die Match Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm space-y-2">
                  <h4 className="text-xs font-bold text-[#e4e4e4] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#1a1a1a] pb-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    Mechanical Tension & Power
                  </h4>
                   {(() => {
                    const sigmaD = roundResults.drawingStress || 0
                    const forceN = roundResults.drawingForce || 0
                    const powerKw = roundResults.powerKw || 0
                    const isStressUnsafe = sigmaD >= 0.6 * parseFloat(uts)
                    
                    const epsilon = Math.log(roundResults.inArea / roundResults.outArea)
                    const optAlphaRad = Math.sqrt(1.5 * mu * epsilon)
                    const optAlphaDeg = optAlphaRad * (180 / Math.PI)

                    return (
                      <div className="space-y-1.5 font-mono text-xs text-[#e4e4e4]">
                        <div className="flex justify-between">
                          <span className="text-[#6b7280] uppercase text-[10px]">Drawing Force:</span>
                          <span className="font-bold tabular-nums">{forceN.toFixed(0)} N</span>
                        </div>
                        <div className="flex justify-between border-t border-[#1a1a1a] pt-1">
                          <span className="text-[#6b7280] uppercase text-[10px]">Drawing Stress:</span>
                          <span className={`font-bold tabular-nums ${isStressUnsafe ? 'text-red-400' : 'text-blue-400'}`}>
                            {sigmaD.toFixed(1)} MPa {isStressUnsafe && '(LIMIT)'}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-[#1a1a1a] pt-1">
                          <span className="text-[#6b7280] uppercase text-[10px]">Power Required:</span>
                          <span className="font-bold text-emerald-400 tabular-nums">{powerKw.toFixed(2)} kW</span>
                        </div>
                        <div className="flex justify-between border-t border-[#1a1a1a] pt-1">
                          <span className="text-[#6b7280] uppercase text-[10px]">Optimum Half-Angle:</span>
                          <span className="font-bold text-cyan-400 tabular-nums">{optAlphaDeg.toFixed(1)}°</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm space-y-2">
                  <h4 className="text-xs font-bold text-[#e4e4e4] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#1a1a1a] pb-1.5">
                    <Table className="h-3.5 w-3.5 text-blue-500" />
                    Matched Dies in Inventory
                  </h4>
                  
                  {matchingDies[888] ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {matchingDies[888].length > 0 ? (
                        matchingDies[888].map(die => (
                          <a
                            key={die.die_id}
                            href={`#/dies/${die.die_id}`}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold border transition ${
                              die.status === 'AVAILABLE'
                                ? 'bg-[#141414] border-emerald-500/30 text-emerald-400'
                                : 'bg-[#141414] border-amber-500/30 text-amber-400'
                            }`}
                          >
                            {die.die_id} ({parseFloat(die.current_size).toFixed(3)}mm)
                          </a>
                        ))
                      ) : (
                        <span className="text-xs text-[#6b7280] font-mono">No matching dies in inventory</span>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => findMatchingDies(888, roundResults.outlet)}
                      disabled={loadingDies[888]}
                      className="w-full py-1.5 bg-[#141414] hover:bg-[#1f1f1f] text-blue-400 text-xs font-bold rounded-sm border border-[#2a2a2a] transition disabled:opacity-40 cursor-pointer uppercase"
                    >
                      {loadingDies[888] ? 'Searching...' : 'Scan Inventory'}
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm py-12 px-4 flex flex-col items-center justify-center text-center space-y-2">
              <div className={`p-2 rounded-sm border ${roundValidationError ? 'bg-[#141414] border-amber-500/30 text-amber-400' : 'bg-[#141414] border-[#2a2a2a] text-[#6b7280]'}`}>
                {roundValidationError ? <AlertTriangle className="h-5 w-5" /> : <Info className="h-5 w-5" />}
              </div>
              <div className="space-y-0.5 max-w-md">
                <h4 className={`text-xs font-bold uppercase ${roundValidationError ? 'text-amber-400' : 'text-[#e4e4e4]'}`}>
                  {roundValidationError ? 'Invalid Sizing Parameters' : 'Waiting for Parameters'}
                </h4>
                <p className="text-xs text-[#6b7280]">
                  {roundValidationError || 'Enter diameters in the configurator panel to compute deformation stats.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {roundResults && (
          <div className="mt-6 border-t border-[#1a1a1a] pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-[#6b7280] font-mono uppercase">
            <span>A₁L₁ = A₂L₂ MASS CONSERVED</span>
            <span>ROUNDED TO 3 DECIMAL PLACES</span>
          </div>
        )}
      </div>
    </>
  )
}
