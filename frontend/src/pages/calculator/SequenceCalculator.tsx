import { Calculator, ArrowRight, Table, Info, Maximize2 } from 'lucide-react'

interface SequenceCalculatorProps {
  // Sequence state
  seqStart: string
  setSeqStart: (val: string) => void
  seqEnd: string
  setSeqEnd: (val: string) => void
  seqReduction: string
  setSeqReduction: (val: string) => void
  seqOptMode: string
  setSeqOptMode: (mode: any) => void

  // Computed results
  sequenceResults: any
  sequenceValidationError: string | null

  // Physics (needed for results table)
  drawSpeed: string
  dieAngle: string
  mu: number
  materialType: string
  yieldStrength: string
  uts: string

  // Physics helpers
  getMaterialLimit: () => number

  // CSV export
  exportSequenceCSV: () => void

  // Die matching
  matchingDies: Record<number, any[]>
  loadingDies: Record<number, boolean>
  findMatchingDies: (passNo: number, targetSize: number) => Promise<void>
}

export function SequenceCalculator({
  seqStart,
  setSeqStart,
  seqEnd,
  setSeqEnd,
  seqReduction,
  setSeqReduction,
  seqOptMode,
  setSeqOptMode,
  sequenceResults,
  uts,
  getMaterialLimit,
  exportSequenceCSV,
  matchingDies,
  loadingDies,
  findMatchingDies,
}: SequenceCalculatorProps) {
  return (
    <>
      {/* Inputs Panel */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          document.getElementById('sequence-results')?.scrollIntoView({ behavior: 'smooth' });
        }}
        className="lg:col-span-4 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 space-y-4 font-mono"
      >
        <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-bold text-[#e4e4e4] uppercase tracking-wider">
              01 SEQUENCE LIMITS
            </h3>
            <span className="px-1.5 py-0.2 rounded-sm bg-[#141414] text-purple-400 border border-purple-500/30 text-[9px] font-mono uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              LIVE
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#6b7280]">DIES_SEQUENCE</span>
        </div>

        <div className="space-y-3">
          {/* Start Diameter */}
          <div>
            <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
              Start Stock Diameter (d₀)
            </label>
            <div className="relative rounded-sm">
              <input 
                type="number" 
                step="0.01" 
                value={seqStart}
                onChange={(e) => setSeqStart(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-3 py-2 pr-12 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
              />
              <div className="absolute right-2 top-1.5 text-[#6b7280] text-[10px] font-mono font-bold uppercase">
                mm
              </div>
            </div>
          </div>

          {/* Target End Diameter */}
          <div>
            <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
              Target End Size (d_n)
            </label>
            <div className="relative rounded-sm">
              <input 
                type="number" 
                step="0.01" 
                value={seqEnd}
                onChange={(e) => setSeqEnd(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-3 py-2 pr-12 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
              />
              <div className="absolute right-2 top-1.5 text-[#6b7280] text-[10px] font-mono font-bold uppercase">
                mm
              </div>
            </div>
          </div>

          {/* Target Reduction/Pass */}
          <div>
            <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
              Pass Area Reduction (R_avg)
            </label>
            <div className="relative rounded-sm">
              <input 
                type="number" 
                step="0.5" 
                value={seqReduction}
                onChange={(e) => setSeqReduction(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-3 py-2 pr-10 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
              />
              <div className="absolute right-2 top-1.5 text-[#6b7280] text-[10px] font-mono font-bold uppercase">
                %
              </div>
            </div>
          </div>

          {/* Sequence Optimization Mode */}
          <div>
            <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
              Pass Optimization Mode
            </label>
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm p-0.5 flex gap-1">
              <button
                type="button"
                onClick={() => setSeqOptMode('constant')}
                className={`flex-1 py-1.5 px-2 rounded-sm text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                  seqOptMode === 'constant'
                    ? 'bg-[#141414] text-purple-400 border border-purple-500/40'
                    : 'text-[#6b7280] hover:text-[#e4e4e4]'
                }`}
              >
                Constant Draft
              </button>
              <button
                type="button"
                onClick={() => setSeqOptMode('graduated')}
                className={`flex-1 py-1.5 px-2 rounded-sm text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                  seqOptMode === 'graduated'
                    ? 'bg-[#141414] text-purple-400 border border-purple-500/40'
                    : 'text-[#6b7280] hover:text-[#e4e4e4]'
                }`}
              >
                Graduated
              </button>
            </div>
          </div>
          
          <button
            type="submit"
            className="w-full py-2.5 bg-[#141414] hover:bg-[#1f1f1f] border border-purple-500/50 text-purple-400 hover:text-purple-300 font-bold text-xs uppercase tracking-wider rounded-sm transition flex items-center justify-center gap-1.5 mt-3 cursor-pointer"
          >
            <Calculator className="h-3.5 w-3.5" />
            Generate Pass Sequence
          </button>
        </div>
      </form>

      {/* Sequence Output */}
      <div id="sequence-results" className="lg:col-span-8 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 shadow-2xl space-y-4 font-mono">
        <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
          <h3 className="text-xs font-bold text-[#e4e4e4] uppercase tracking-wider">
            02 SIZING SEQUENCE TELEMETRY
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={exportSequenceCSV}
              className="px-2.5 py-1 bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] text-[10px] uppercase font-bold rounded-sm transition flex items-center gap-1 cursor-pointer"
            >
              <Table className="h-3 w-3 text-purple-500" />
              Export CSV
            </button>
            <span className="text-[10px] font-mono text-[#6b7280]">MULTI_PASS</span>
          </div>
        </div>

        {sequenceResults && sequenceResults.steps.length > 0 ? (
          <div className="space-y-4">
            {/* Sequence Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fadeIn font-mono">
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm">
                <span className="text-[10px] text-[#6b7280] uppercase tracking-wider block mb-1">
                  Total Passes
                </span>
                <div className="text-xl font-bold font-mono text-purple-400 tabular-nums">
                  {sequenceResults.steps.length} <span className="text-xs text-[#6b7280]">DIES</span>
                </div>
              </div>

              <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm">
                <span className="text-[10px] text-[#6b7280] uppercase tracking-wider block mb-1">
                  Pass Ratio
                </span>
                <div className="text-xl font-bold font-mono text-indigo-400 tabular-nums">
                  {(1 / (1 - parseFloat(seqReduction) / 100)).toFixed(3)}
                </div>
              </div>

              <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm">
                <span className="text-[10px] text-[#6b7280] uppercase tracking-wider block mb-1">
                  Cumulative Red.
                </span>
                <div className="text-xl font-bold font-mono text-blue-400 tabular-nums">
                  {sequenceResults.totalReduction.toFixed(1)}%
                </div>
              </div>

              <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm">
                <span className="text-[10px] text-[#6b7280] uppercase tracking-wider block mb-1">
                  Length Multiplier
                </span>
                <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                  {((sequenceResults.totalElongation / 100) + 1).toFixed(2)}x
                </div>
              </div>
            </div>

            {/* Sizing sequence list */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8 border border-[#1a1a1a] rounded-sm overflow-hidden bg-[#0a0a0a]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-[#0a0a0a] border-b border-[#1a1a1a] text-[#6b7280] uppercase tracking-wider">
                        <th className="p-2.5 text-[10px]">Pass</th>
                        <th className="p-2.5 text-[10px]">Inlet</th>
                        <th className="p-2.5 text-[10px] text-center">Flow</th>
                        <th className="p-2.5 text-[10px]">Outlet</th>
                        <th className="p-2.5 text-[10px] text-right">Draft %</th>
                        <th className="p-2.5 text-[10px] text-right">Tension</th>
                        <th className="p-2.5 text-[10px] text-right">Stress</th>
                        <th className="p-2.5 text-[10px] text-right">Power</th>
                        <th className="p-2.5 text-[10px]">Die</th>
                        <th className="p-2.5 text-[10px] text-right">Cum. %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a1a1a] text-[#e4e4e4]">
                      {sequenceResults.steps.map((step: any) => {
                        const currentArea = Math.PI * Math.pow(step.outlet / 2, 2)
                        const startArea = Math.PI * Math.pow(parseFloat(seqStart) / 2, 2)
                        const cumulativeRed = ((startArea - currentArea) / startArea) * 100

                        const limit = getMaterialLimit()
                        const isStepUnsafe = step.reduction > limit

                        const sigmaD = step.drawingStress || 0
                        const forceN = step.drawingForce || 0
                        const powerKw = step.power || 0
                        const isStressUnsafe = sigmaD >= 0.6 * parseFloat(uts)

                        return (
                          <tr key={step.draft} className={`hover:bg-[#141414] transition-colors ${(isStepUnsafe || isStressUnsafe) ? 'bg-red-950/20' : ''}`}>
                            <td className="p-2.5">
                              <span className={`px-1.5 py-0.2 rounded-sm text-[10px] font-mono font-bold ${(isStepUnsafe || isStressUnsafe) ? 'bg-[#141414] border border-red-500/40 text-red-400' : 'bg-[#141414] border border-[#2a2a2a] text-purple-400'}`}>
                                #{step.draft}
                              </span>
                            </td>
                            <td className="p-2.5 text-[#6b7280] tabular-nums">
                              {step.inlet.toFixed(3)}
                            </td>
                            <td className="p-2.5 text-center">
                              <ArrowRight className="h-3 w-3 text-[#6b7280] mx-auto" />
                            </td>
                            <td className="p-2.5 font-bold text-[#e4e4e4] tabular-nums">
                              {step.outlet.toFixed(3)}
                            </td>
                            <td className={`p-2.5 text-right tabular-nums ${isStepUnsafe ? 'text-red-400 font-bold' : 'text-blue-400'}`}>
                              {step.reduction.toFixed(1)}%
                            </td>
                            <td className="p-2.5 text-right text-[#e4e4e4] tabular-nums">
                              {forceN.toFixed(0)} N
                            </td>
                            <td className={`p-2.5 text-right tabular-nums ${isStressUnsafe ? 'text-red-400 font-bold' : 'text-[#e4e4e4]'}`}>
                              {sigmaD.toFixed(1)} MPa
                            </td>
                            <td className="p-2.5 text-right text-emerald-400 tabular-nums font-semibold">
                              {powerKw.toFixed(2)} kW
                            </td>
                            <td className="p-2.5">
                              {matchingDies[step.draft] ? (
                                <div className="flex flex-col gap-1">
                                  {matchingDies[step.draft].length > 0 ? (
                                    matchingDies[step.draft].map((die: any) => (
                                      <a
                                        key={die.die_id}
                                        href={`#/dies/${die.die_id}`}
                                        className={`inline-flex items-center justify-center px-1.5 py-0.2 rounded-sm text-[9px] font-bold border transition ${
                                          die.status === 'AVAILABLE'
                                            ? 'bg-[#141414] border-emerald-500/30 text-emerald-400'
                                            : 'bg-[#141414] border-amber-500/30 text-amber-400'
                                        }`}
                                      >
                                        {die.die_id}
                                      </a>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-[#6b7280]">None</span>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => findMatchingDies(step.draft, step.outlet)}
                                  disabled={loadingDies[step.draft]}
                                  className="px-1.5 py-0.2 bg-[#141414] hover:bg-[#1f1f1f] text-blue-400 text-[10px] font-bold rounded-sm border border-[#2a2a2a] transition disabled:opacity-40 cursor-pointer"
                                >
                                  {loadingDies[step.draft] ? '...' : 'Scan'}
                                </button>
                              )}
                            </td>
                            <td className="p-2.5 text-right tabular-nums text-[#6b7280]">
                              {cumulativeRed.toFixed(1)}%
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SVG Visualizer on the right */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 rounded-sm space-y-3 font-mono">
                  <h4 className="text-xs font-bold text-[#e4e4e4] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#1a1a1a] pb-2">
                    <Maximize2 className="h-3.5 w-3.5 text-blue-500" />
                    Draft Reduction Visualizer
                  </h4>
                  <div className="flex items-center justify-center bg-[#0a0a0a] rounded-sm p-4 border border-[#1a1a1a] relative overflow-hidden">
                    <svg viewBox="0 0 200 200" className="w-40 h-40">
                      {/* Outer circle */}
                      <circle cx="100" cy="100" r={80} fill="none" stroke="#2a2a2a" strokeWidth="1" strokeDasharray="3 3" />
                      
                      {/* Draw circles for each step */}
                      {sequenceResults.steps.map((step: any, idx: number) => {
                        const maxDia = parseFloat(seqStart)
                        const currentRadius = (step.outlet / maxDia) * 80
                        const isLast = idx === sequenceResults.steps.length - 1
                        
                        return (
                          <circle
                            key={step.draft}
                            cx="100"
                            cy="100"
                            r={currentRadius}
                            fill={isLast ? 'rgba(59,130,246,0.1)' : 'none'}
                            stroke={isLast ? '#3b82f6' : '#6b7280'}
                            strokeWidth={isLast ? 2 : 1}
                          />
                        )
                      })}
                      
                      {/* Center point */}
                      <circle cx="100" cy="100" r="2" fill="#3b82f6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm py-16 px-4 flex flex-col items-center justify-center text-center space-y-2">
            <div className="p-2 rounded-sm bg-[#141414] border border-[#2a2a2a] text-[#6b7280]">
              <Info className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-[#e4e4e4] uppercase">Awaiting Sequence Range</h4>
              <p className="text-xs text-[#6b7280]">
                Enter stock and target sizes to plot the draw stage progression matrix.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
