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
        className="lg:col-span-5 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 space-y-4 font-mono"
      >
        <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-bold text-[#e4e4e4] uppercase tracking-wider">
              01 FLAT PROFILING INPUTS
            </h3>
            <span className="px-1.5 py-0.2 rounded-sm bg-[#141414] text-emerald-400 border border-emerald-500/30 text-[9px] font-mono uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              LIVE
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#6b7280]">FLAT_STRIP</span>
        </div>

        <div className="space-y-4">
          {/* Inlet Geometry */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block">
              Inlet Stock Profile (Raw)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
                  Width (w₁)
                </label>
                <div className="relative rounded-sm">
                  <input
                    type="number"
                    step="0.01"
                    value={flatInWidth}
                    onChange={(e) => setFlatInWidth(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-3 py-1.5 pr-10 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                  <div className="absolute right-2 top-1.5 text-[#6b7280] text-[10px] font-mono">
                    mm
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
                  Thickness (t₁)
                </label>
                <div className="relative rounded-sm">
                  <input
                    type="number"
                    step="0.01"
                    value={flatInThick}
                    onChange={(e) => setFlatInThick(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-3 py-1.5 pr-10 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                  <div className="absolute right-2 top-1.5 text-[#6b7280] text-[10px] font-mono">
                    mm
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Outlet Geometry */}
          <div className="space-y-2 pt-3 border-t border-[#1a1a1a]">
            <span className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block">
              Outlet Finished Profile
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
                  Width (w₂)
                </label>
                <div className="relative rounded-sm">
                  <input
                    type="number"
                    step="0.01"
                    value={flatOutWidth}
                    onChange={(e) => setFlatOutWidth(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-3 py-1.5 pr-10 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                  <div className="absolute right-2 top-1.5 text-[#6b7280] text-[10px] font-mono">
                    mm
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
                  Thickness (t₂)
                </label>
                <div className="relative rounded-sm">
                  <input
                    type="number"
                    step="0.01"
                    value={flatOutThick}
                    onChange={(e) => setFlatOutThick(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-3 py-1.5 pr-10 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                  <div className="absolute right-2 top-1.5 text-[#6b7280] text-[10px] font-mono">
                    mm
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-[#141414] hover:bg-[#1f1f1f] border border-emerald-500/50 text-emerald-400 hover:text-emerald-300 font-bold text-xs uppercase tracking-wider rounded-sm transition flex items-center justify-center gap-1.5 mt-3 cursor-pointer"
          >
            <Calculator className="h-3.5 w-3.5" />
            Calculate Flat Profile
          </button>
        </div>
      </form>

      {/* Outputs Column */}
      <div id="flat-results" className="lg:col-span-7 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 flex flex-col justify-between shadow-2xl min-h-[500px] font-mono">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
            <h3 className="text-xs font-bold text-[#e4e4e4] uppercase tracking-wider">
              02 PROFILE TRANSFORMATION MATRIX
            </h3>
            <span className="text-[10px] font-mono text-[#6b7280]">ROLLING_TRANSITION</span>
          </div>

          {flatResults ? (
            <>
              {/* Interactive Profile comparison graphic */}
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm p-3 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-2 left-3 text-[9px] font-mono text-[#6b7280] tracking-wider flex items-center gap-1 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  ASPECT DEFORMATION OVERLAY
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
                    <svg className="w-full h-[160px]" viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg">
                      <line x1="250" y1="20" x2="250" y2="180" stroke="#2a2a2a" strokeWidth="1" strokeDasharray="3 3" />

                      {/* Left profile: Inlet */}
                      <g transform="translate(130, 100)">
                        <rect
                          x={-inW/2}
                          y={-inH/2}
                          width={inW}
                          height={inH}
                          fill="#141414"
                          stroke="#10b981"
                          strokeWidth="1.5"
                        />
                        <text x="0" y={inH/2 + 20} fill="#10b981" fontSize="9" fontFamily="monospace" textAnchor="middle">
                          w₁:{inValW.toFixed(1)} t₁:{inValT.toFixed(1)}
                        </text>
                        <text x="0" y={-inH/2 - 8} fill="#10b981" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                          RAW STOCK
                        </text>
                      </g>

                      {/* Center Transition indicator */}
                      <g transform="translate(250, 100)">
                        <circle r="10" fill="#141414" stroke="#2a2a2a" strokeWidth="1" />
                      </g>

                      {/* Right profile: Outlet */}
                      <g transform="translate(370, 100)">
                        <rect
                          x={-outW/2}
                          y={-outH/2}
                          width={outW}
                          height={outH}
                          fill="#141414"
                          stroke="#3b82f6"
                          strokeWidth="1.5"
                        />
                        <text x="0" y={outH/2 + 20} fill="#3b82f6" fontSize="9" fontFamily="monospace" textAnchor="middle">
                          w₂:{outValW.toFixed(1)} t₂:{outValT.toFixed(1)}
                        </text>
                        <text x="0" y={-inH/2 - 8} fill="#3b82f6" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
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
                      <div className="bg-[#141414] border border-red-500/30 rounded-sm p-3 flex items-start gap-2 text-red-400">
                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold block uppercase">WARNING: YIELD LIMIT EXCEEDED</span>
                          <p className="text-[11px] text-red-300 leading-tight mt-0.5">
                            Area reduction ({flatResults.reduction.toFixed(2)}%) exceeds safe threshold ({limit}%).
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#141414] border border-emerald-500/30 rounded-sm p-3 flex items-start gap-2 text-emerald-400">
                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold block uppercase">DRAFT SIZING VERIFIED</span>
                          <p className="text-[11px] text-emerald-300 leading-tight mt-0.5">
                            Reduction ({flatResults.reduction.toFixed(2)}%) is within safe limits ({limit}% max limit).
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* KPI Metric Readouts */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
                {/* KPI 1: Area Reduction */}
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm">
                  <span className="text-[10px] text-[#6b7280] uppercase tracking-wider block mb-1">
                    Area Red. (R)
                  </span>
                  <div className="text-lg font-bold font-mono text-emerald-400 tabular-nums">
                    {flatResults.reduction.toFixed(2)}%
                  </div>
                </div>

                {/* KPI 2: Elongation */}
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm">
                  <span className="text-[10px] text-[#6b7280] uppercase tracking-wider block mb-1">
                    Elongation (E)
                  </span>
                  <div className="text-lg font-bold font-mono text-blue-400 tabular-nums">
                    {flatResults.elongation.toFixed(2)}%
                  </div>
                </div>

                {/* KPI 3: Width Reduction */}
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm">
                  <span className="text-[10px] text-[#6b7280] uppercase tracking-wider block mb-1">
                    Width Red.
                  </span>
                  <div className="text-lg font-bold font-mono text-[#e4e4e4] tabular-nums">
                    {flatResults.widthRed.toFixed(2)}%
                  </div>
                </div>

                {/* KPI 4: Thickness Reduction */}
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm">
                  <span className="text-[10px] text-[#6b7280] uppercase tracking-wider block mb-1">
                    Thick. Red.
                  </span>
                  <div className="text-lg font-bold font-mono text-[#e4e4e4] tabular-nums">
                    {flatResults.thickRed.toFixed(2)}%
                  </div>
                </div>

                {/* Area A1 */}
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm col-span-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-[#6b7280] uppercase text-[10px]">Inlet Area (A₁)</span>
                    <span className="font-bold text-[#e4e4e4] tabular-nums">
                      {flatResults.inArea.toFixed(2)} <span className="text-[#6b7280]">mm²</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono mt-1 border-t border-[#1a1a1a] pt-1">
                    <span className="text-[#6b7280] uppercase text-[10px]">Inlet Aspect (w₁/t₁)</span>
                    <span className="font-bold text-[#e4e4e4] tabular-nums">
                      {flatResults.aspectIn.toFixed(2)}:1
                    </span>
                  </div>
                </div>

                {/* Area A2 */}
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm col-span-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-[#6b7280] uppercase text-[10px]">Outlet Area (A₂)</span>
                    <span className="font-bold text-[#e4e4e4] tabular-nums">
                      {flatResults.outArea.toFixed(2)} <span className="text-[#6b7280]">mm²</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono mt-1 border-t border-[#1a1a1a] pt-1">
                    <span className="text-[#6b7280] uppercase text-[10px]">Outlet Aspect (w₂/t₂)</span>
                    <span className="font-bold text-[#e4e4e4] tabular-nums">
                      {flatResults.aspectOut.toFixed(2)}:1
                    </span>
                  </div>
                </div>
              </div>

              {/* Flat Drawing Physics & Die Match Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 font-mono">
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm space-y-2">
                  <h4 className="text-xs font-bold text-[#e4e4e4] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#1a1a1a] pb-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
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
                    Matched Flat Dies in Inventory
                  </h4>

                  {matchingDies[999] ? (
                    <div className="flex flex-wrap gap-1.5 pt-1 font-mono">
                      {matchingDies[999].length > 0 ? (
                        matchingDies[999].map(die => (
                          <a
                            key={die.die_id}
                            href={`#/dies/${die.die_id}`}
                            className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold border transition ${
                              die.status === 'AVAILABLE'
                                ? 'bg-[#141414] border-emerald-500/30 text-emerald-400'
                                : 'bg-[#141414] border-amber-500/30 text-amber-400'
                            }`}
                          >
                            {die.die_id} ({parseFloat(die.width || 0).toFixed(2)}x{parseFloat(die.thickness || 0).toFixed(2)}mm)
                          </a>
                        ))
                      ) : (
                        <span className="text-xs text-[#6b7280] font-mono">No matching flat dies</span>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => findMatchingFlatDies(999, parseFloat(flatOutWidth), parseFloat(flatOutThick))}
                      disabled={loadingDies[999]}
                      className="w-full py-1.5 bg-[#141414] hover:bg-[#1f1f1f] text-blue-400 text-xs font-bold rounded-sm border border-[#2a2a2a] transition disabled:opacity-40 cursor-pointer uppercase"
                    >
                      {loadingDies[999] ? 'Searching...' : 'Scan Inventory'}
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm py-16 px-4 flex flex-col items-center justify-center text-center space-y-2">
              <div className={`p-2 rounded-sm border ${flatValidationError ? 'bg-[#141414] border-amber-500/30 text-amber-400' : 'bg-[#141414] border-[#2a2a2a] text-[#6b7280]'}`}>
                {flatValidationError ? <AlertTriangle className="h-5 w-5" /> : <Info className="h-5 w-5" />}
              </div>
              <div className="space-y-0.5 max-w-md">
                <h4 className={`text-xs font-bold uppercase ${flatValidationError ? 'text-amber-400' : 'text-[#e4e4e4]'}`}>
                  {flatValidationError ? 'Invalid Flat Profile Parameters' : 'Awaiting Parameters'}
                </h4>
                <p className="text-xs text-[#6b7280]">
                  {flatValidationError || 'Enter dimensions in configurator panel to generate deformation matrix.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {flatResults && (
          <div className="mt-6 border-t border-[#1a1a1a] pt-3 text-[10px] text-[#6b7280] font-mono uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            STRIP-DRAWING PLANE STRESS THEORY COMPLIANT
          </div>
        )}
      </div>
    </>
  )
}
