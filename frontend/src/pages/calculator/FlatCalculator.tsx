import { Calculator, ArrowRight, Table, Info, AlertTriangle, Zap } from 'lucide-react'

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
  return (
    <>
      {/* Inputs Panel */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          document.getElementById('flat-results')?.scrollIntoView({ behavior: 'smooth' });
        }}
        className="lg:col-span-5 bg-[#0D1325] border border-[#1b253b] rounded-2xl p-6 space-y-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[#1b253b] pb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
              Flat Profiling Inputs
            </h3>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">TAB_3 // FLAT_STRIP</span>
        </div>

        <div className="space-y-6">
          {/* Inlet Geometry */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest block">
              Inlet Stock Profile (Raw)
            </span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Width (w₁)
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <input
                    type="number"
                    step="0.01"
                    value={flatInWidth}
                    onChange={(e) => setFlatInWidth(e.target.value)}
                    className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-3.5 py-2.5 pr-14 text-white font-mono text-xs focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-premium"
                  />
                  <div className="absolute right-2.5 top-1.5 px-2 py-0.5 bg-[#121A2F] border border-[#2b3a61]/40 rounded text-slate-500 text-[10px] font-mono shadow-inner">
                    mm
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Thickness (t₁)
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <input
                    type="number"
                    step="0.01"
                    value={flatInThick}
                    onChange={(e) => setFlatInThick(e.target.value)}
                    className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-3.5 py-2.5 pr-14 text-white font-mono text-xs focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-premium"
                  />
                  <div className="absolute right-2.5 top-1.5 px-2 py-0.5 bg-[#121A2F] border border-[#2b3a61]/40 rounded text-slate-500 text-[10px] font-mono shadow-inner">
                    mm
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Outlet Geometry */}
          <div className="space-y-3 pt-4 border-t border-[#1b253b]">
            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
              Outlet finished Profile
            </span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Width (w₂)
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <input
                    type="number"
                    step="0.01"
                    value={flatOutWidth}
                    onChange={(e) => setFlatOutWidth(e.target.value)}
                    className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-3.5 py-2.5 pr-14 text-white font-mono text-xs focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-premium"
                  />
                  <div className="absolute right-2.5 top-1.5 px-2 py-0.5 bg-[#121A2F] border border-[#2b3a61]/40 rounded text-slate-500 text-[10px] font-mono shadow-inner">
                    mm
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Thickness (t₂)
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <input
                    type="number"
                    step="0.01"
                    value={flatOutThick}
                    onChange={(e) => setFlatOutThick(e.target.value)}
                    className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-3.5 py-2.5 pr-14 text-white font-mono text-xs focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-premium"
                  />
                  <div className="absolute right-2.5 top-1.5 px-2 py-0.5 bg-[#121A2F] border border-[#2b3a61]/40 rounded text-slate-500 text-[10px] font-mono shadow-inner">
                    mm
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-300 shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 mt-4 hover:-translate-y-0.5"
          >
            <Calculator className="" />
            Calculate Flat Profile
          </button>
        </div>
      </form>

      {/* Outputs Column */}
      <div id="flat-results" className="lg:col-span-7 bg-[#0D1325] border border-[#1b253b] rounded-2xl p-6 flex flex-col justify-between shadow-xl min-h-[580px]">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#1b253b] pb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
              Profile Transformation Matrix
            </h3>
            <span className="text-[10px] font-mono text-slate-500">SCHEMATIC // ROLLING_TRANSITION</span>
          </div>

          {flatResults ? (
            <>
              {/* Interactive Profile comparison graphic */}
              <div className="bg-[#050816] border border-[#1b253b] rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden shadow-inner blueprint-grid">
                <div className="absolute top-3 left-4 text-[9px] font-mono text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Aspect Deformation Overlay
                </div>

                {(() => {
                  const inValW = parseFloat(flatInWidth) || 20.0
                  const inValT = parseFloat(flatInThick) || 5.0
                  const outValW = parseFloat(flatOutWidth) || 18.0
                  const outValT = parseFloat(flatOutThick) || 4.5

                  const maxDimension = Math.max(inValW, inValT, outValW, outValT, 1)
                  const scale = 110 / maxDimension

                  const inW = inValW * scale
                  const inH = inValT * scale
                  const outW = outValW * scale
                  const outH = outValT * scale

                  return (
                    <svg className="w-full h-[180px]" viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="hatchEmerald" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(16, 185, 129, 0.15)" strokeWidth="1" />
                        </pattern>
                        <pattern id="hatchBlue" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(59, 130, 246, 0.18)" strokeWidth="1" />
                        </pattern>
                      </defs>

                      {/* Grid lines */}
                      <line x1="250" y1="20" x2="250" y2="180" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="3 3" />

                      {/* Left profile: Inlet */}
                      <g transform="translate(130, 100)">
                        <rect
                          x={-inW/2}
                          y={-inH/2}
                          width={inW}
                          height={inH}
                          fill="rgba(16, 185, 129, 0.05)"
                          stroke="#10b981"
                          strokeWidth="2"
                        />
                        <rect
                          x={-inW/2}
                          y={-inH/2}
                          width={inW}
                          height={inH}
                          fill="url(#hatchEmerald)"
                        />

                        {/* Width Dimension */}
                        <line x1={-inW/2} y1={inH/2 + 15} x2={inW/2} y2={inH/2 + 15} stroke="#10b981" strokeWidth="1" />
                        <polygon points={`${-inW/2},${inH/2 + 15} ${-inW/2 + 5},${inH/2 + 12} ${-inW/2 + 5},${inH/2 + 18}`} fill="#10b981" />
                        <polygon points={`${inW/2},${inH/2 + 15} ${inW/2 - 5},${inH/2 + 12} ${inW/2 - 5},${inH/2 + 18}`} fill="#10b981" />
                        <text x="0" y={inH/2 + 27} fill="#10b981" fontSize="9" fontFamily="Fira Code, monospace" textAnchor="middle">
                          w₁:{inValW.toFixed(1)}
                        </text>

                        {/* Thickness Dimension */}
                        <line x1={-inW/2 - 15} y1={-inH/2} x2={-inW/2 - 15} y2={inH/2} stroke="#10b981" strokeWidth="1" />
                        <polygon points={`${-inW/2 - 15},${-inH/2} ${-inW/2 - 18},${-inH/2 + 5} ${-inW/2 - 12},${-inH/2 + 5}`} fill="#10b981" />
                        <polygon points={`${-inW/2 - 15},${inH/2} ${-inW/2 - 18},${inH/2 - 5} ${-inW/2 - 12},${inH/2 - 5}`} fill="#10b981" />
                        <text x={-inW/2 - 25} y="3" fill="#10b981" fontSize="9" fontFamily="Fira Code, monospace" textAnchor="end">
                          t₁:{inValT.toFixed(1)}
                        </text>

                        <text x="0" y={-inH/2 - 12} fill="rgba(16, 185, 129, 0.8)" fontSize="10" fontFamily="Outfit, sans-serif" fontWeight="bold" textAnchor="middle">
                          RAW STOCK
                        </text>
                      </g>

                      {/* Center Transition indicator */}
                      <g transform="translate(250, 100)">
                        <circle r="12" fill="#0D1325" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="1" />
                        <ArrowRight className="h-4 w-4 text-slate-500 absolute -left-2 -top-2 animate-pulse" />
                      </g>

                      {/* Right profile: Outlet overlaid with Inlet dashed */}
                      <g transform="translate(370, 100)">
                        {/* Inlet contour for comparison */}
                        <rect
                          x={-inW/2}
                          y={-inH/2}
                          width={inW}
                          height={inH}
                          fill="none"
                          stroke="rgba(16, 185, 129, 0.2)"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                        />

                        {/* Finished outlet rectangle */}
                        <rect
                          x={-outW/2}
                          y={-outH/2}
                          width={outW}
                          height={outH}
                          fill="rgba(59, 130, 246, 0.06)"
                          stroke="#3b82f6"
                          strokeWidth="2"
                        />
                        <rect
                          x={-outW/2}
                          y={-outH/2}
                          width={outW}
                          height={outH}
                          fill="url(#hatchBlue)"
                        />

                        {/* Width Dimension */}
                        <line x1={-outW/2} y1={outH/2 + 15} x2={outW/2} y2={outH/2 + 15} stroke="#3b82f6" strokeWidth="1" />
                        <polygon points={`${-outW/2},${outH/2 + 15} ${-outW/2 + 5},${outH/2 + 12} ${-outW/2 + 5},${outH/2 + 18}`} fill="#3b82f6" />
                        <polygon points={`${outW/2},${outH/2 + 15} ${outW/2 - 5},${outH/2 + 12} ${outW/2 - 5},${outH/2 + 18}`} fill="#3b82f6" />
                        <text x="0" y={outH/2 + 27} fill="#3b82f6" fontSize="9" fontFamily="Fira Code, monospace" textAnchor="middle">
                          w₂:{outValW.toFixed(1)}
                        </text>

                        {/* Thickness Dimension */}
                        <line x1={outW/2 + 15} y1={-outH/2} x2={outW/2 + 15} y2={outH/2} stroke="#3b82f6" strokeWidth="1" />
                        <polygon points={`${outW/2 + 15},${-outH/2} ${outW/2 + 12},${-outH/2 + 5} ${outW/2 + 18},${-outH/2 + 5}`} fill="#3b82f6" />
                        <polygon points={`${outW/2 + 15},${outH/2} ${outW/2 + 12},${outH/2 - 5} ${outW/2 + 18},${outH/2 - 5}`} fill="#3b82f6" />
                        <text x={outW/2 + 23} y="3" fill="#3b82f6" fontSize="9" fontFamily="Fira Code, monospace" textAnchor="start">
                          t₂:{outValT.toFixed(1)}
                        </text>

                        <text x="0" y={-inH/2 - 12} fill="rgba(59, 130, 246, 0.9)" fontSize="10" fontFamily="Outfit, sans-serif" fontWeight="bold" textAnchor="middle">
                          FINISHED STRIP
                        </text>
                      </g>
                    </svg>
                  )
                })()}
              </div>

              {/* Material Yield Verification Message */}
              {(() => {
                const limit = getMaterialLimit()
                const isUnsafe = flatResults.reduction > limit
                return (
                  <div className="animate-fadeIn">
                    {isUnsafe ? (
                      <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start gap-3 text-rose-400 shadow-inner">
                        <Info className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold block uppercase tracking-wider">Warning: Material Yield Limit Exceeded</span>
                          <p className="text-[11px] text-rose-300 leading-normal mt-1">
                            Calculated area reduction (<span className="font-mono font-bold">{flatResults.reduction.toFixed(2)}%</span>) exceeds the safe limit of <span className="font-mono font-bold">{limit}%</span> for the selected stock material. High risk of strip fracturing or roll deformation.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 flex items-start gap-3 text-emerald-400 shadow-inner">
                        <Info className="h-5 w-5 shrink-0 mt-0.5 text-emerald-500" />
                        <div>
                          <span className="text-xs font-bold block uppercase tracking-wider text-emerald-300">Draft Sizing Verified</span>
                          <p className="text-[11px] text-emerald-300 leading-normal mt-1">
                            Sizing is within safe limits for flat drawing (<span className="font-mono font-bold">{flatResults.reduction.toFixed(2)}%</span> vs <span className="font-mono font-bold">{limit}%</span> max limit). Aspect ratio profile is stable.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* KPI Metric Readouts */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* KPI 1: Area Reduction */}
                <div className="bg-[#121A2F] border border-[#1b253b] rounded-xl transition-premium hover:border-emerald-500/30 shadow-inner group">
                  <span className="text-[10px] text-slate-400 font-heading font-semibold uppercase tracking-wider block mb-1">
                    Area Red. (R)
                  </span>
                  <div className="text-xl font-bold font-mono text-emerald-400 tracking-tight">
                    {flatResults.reduction.toFixed(2)}%
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 block">Total draft deformation.</span>
                </div>

                {/* KPI 2: Elongation */}
                <div className="bg-[#121A2F] border border-[#1b253b] rounded-xl transition-premium hover:border-blue-500/30 shadow-inner group">
                  <span className="text-[10px] text-slate-400 font-heading font-semibold uppercase tracking-wider block mb-1">
                    Elongation (E)
                  </span>
                  <div className="text-xl font-bold font-mono text-blue-400 tracking-tight">
                    {flatResults.elongation.toFixed(2)}%
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 block">Exit length increase.</span>
                </div>

                {/* KPI 3: Width Reduction */}
                <div className="bg-[#121A2F] border border-[#1b253b] rounded-xl transition-premium shadow-inner group">
                  <span className="text-[10px] text-slate-400 font-heading font-semibold uppercase tracking-wider block mb-1">
                    Width Red.
                  </span>
                  <div className="text-xl font-bold font-mono text-slate-200 tracking-tight">
                    {flatResults.widthRed.toFixed(2)}%
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 block">Horizontal compression.</span>
                </div>

                {/* KPI 4: Thickness Reduction */}
                <div className="bg-[#121A2F] border border-[#1b253b] rounded-xl transition-premium shadow-inner group">
                  <span className="text-[10px] text-slate-400 font-heading font-semibold uppercase tracking-wider block mb-1">
                    Thick. Red.
                  </span>
                  <div className="text-xl font-bold font-mono text-slate-200 tracking-tight">
                    {flatResults.thickRed.toFixed(2)}%
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 block">Vertical compression.</span>
                </div>

                {/* Area A1 */}
                <div className="bg-[#121A2F] border border-[#1b253b] p-4 rounded-xl shadow-inner col-span-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-heading font-bold">Inlet area (A₁)</span>
                    <span className="font-semibold text-white">
                      {flatResults.inArea.toFixed(2)} <span className="text-[10px] text-slate-500">mm²</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono mt-2 border-t border-[#1b253b]/55 pt-2">
                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-heading font-bold">Inlet Aspect (w₁/t₁)</span>
                    <span className="font-semibold text-slate-300">
                      {flatResults.aspectIn.toFixed(2)}:1
                    </span>
                  </div>
                </div>

                {/* Area A2 */}
                <div className="bg-[#121A2F] border border-[#1b253b] p-4 rounded-xl shadow-inner col-span-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-heading font-bold">Outlet area (A₂)</span>
                    <span className="font-semibold text-white">
                      {flatResults.outArea.toFixed(2)} <span className="text-[10px] text-slate-500">mm²</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono mt-2 border-t border-[#1b253b]/55 pt-2">
                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-heading font-bold">Outlet Aspect (w₂/t₂)</span>
                    <span className="font-semibold text-slate-300">
                      {flatResults.aspectOut.toFixed(2)}:1
                    </span>
                  </div>
                </div>
              </div>

              {/* Flat Drawing Physics & Die Match Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-[#121A2F]/90 border border-[#1b253b] p-5 rounded-xl space-y-3 shadow-inner">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-heading flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Mechanical Tension & Power
                  </h4>
                  {(() => {
                    const sigmaD = flatResults.drawingStress || 0
                    const forceN = flatResults.drawingForce || 0
                    const powerKw = flatResults.powerKw || 0
                    const isStressUnsafe = sigmaD >= 0.6 * parseFloat(uts)

                    const epsilon = Math.log(flatResults.inArea / flatResults.outArea)
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
                    Matched Flat Dies in Inventory
                  </h4>

                  {matchingDies[999] ? (
                    <div className="flex flex-wrap gap-2 pt-1 font-mono">
                      {matchingDies[999].length > 0 ? (
                        matchingDies[999].map(die => (
                          <a
                            key={die.die_id}
                            href={`#/dies/${die.die_id}`}
                            className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold border transition ${
                              die.status === 'AVAILABLE'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                            }`}
                          >
                            {die.die_id} ({parseFloat(die.width || 0).toFixed(2)}x{parseFloat(die.thickness || 0).toFixed(2)}mm)
                          </a>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 font-mono">No matching flat dies in inventory</span>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => findMatchingFlatDies(999, parseFloat(flatOutWidth), parseFloat(flatOutThick))}
                      disabled={loadingDies[999]}
                      className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs font-bold rounded-xl border border-blue-600/30 transition flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {loadingDies[999] ? 'Searching...' : 'Scan Inventory for Matching Dies'}
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[#050816] border border-[#1b253b] rounded-2xl py-16 px-6 flex flex-col items-center justify-center text-center space-y-4 shadow-inner col-span-12">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${flatValidationError ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-slate-900 border border-[#1b253b] text-slate-500'}`}>
                {flatValidationError ? <AlertTriangle className="h-6 w-6" /> : <Info className="h-6 w-6" />}
              </div>
              <div className="space-y-1 max-w-md">
                <h4 className={`text-sm font-bold ${flatValidationError ? 'text-amber-300' : 'text-slate-300'}`}>
                  {flatValidationError ? 'Invalid Flat Profile Parameters' : 'Awaiting Profile Parameters'}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {flatValidationError || 'Please enter valid raw and finished dimensions in the configurator panel to generate deformation matrix graphs.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {flatResults && (
          <div className="mt-8 border-t border-[#1b253b] pt-4 text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
            DEFORMATION FLOW MODELED ACCORDING TO STRIP-DRAWING PLANE STRESS THEORY
          </div>
        )}
      </div>
    </>
  )
}
