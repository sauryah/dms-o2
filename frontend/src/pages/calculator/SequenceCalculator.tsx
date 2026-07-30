import React from 'react'
import { Calculator, Layers, ArrowRight, Table, Info, AlertTriangle, Zap, Maximize2 } from 'lucide-react'

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
  sequenceValidationError,
  drawSpeed,
  dieAngle,
  mu,
  materialType,
  yieldStrength,
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
        className="lg:col-span-4 bg-[#0D1325] border border-[#1b253b] rounded-2xl p-6 space-y-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[#1b253b] pb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
              Sequence Limits
            </h3>
            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-mono uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              Live
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">TAB_2 // DIES_SEQUENCE</span>
        </div>

        <div className="space-y-4">
          {/* Start Diameter */}
          <div>
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2">
              Start Stock Diameter (d₀)
            </label>
            <div className="relative rounded-xl shadow-sm">
              <input 
                type="number" 
                step="0.01" 
                value={seqStart}
                onChange={(e) => setSeqStart(e.target.value)}
                className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-4 py-3.5 pr-16 text-white font-mono text-sm focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 focus:outline-none transition-premium"
              />
              <div className="absolute right-3 top-2.5 px-2.5 py-1 bg-[#121A2F] border border-[#2b3a61]/40 rounded-lg text-slate-400 text-xs font-mono font-bold uppercase tracking-wider shadow-inner">
                mm
              </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-1.5 block">Starting wire dimension (e.g. 8.00mm).</span>
          </div>

          {/* Target End Diameter */}
          <div>
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2">
              Target End Size (d_n)
            </label>
            <div className="relative rounded-xl shadow-sm">
              <input 
                type="number" 
                step="0.01" 
                value={seqEnd}
                onChange={(e) => setSeqEnd(e.target.value)}
                className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-4 py-3.5 pr-16 text-white font-mono text-sm focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 focus:outline-none transition-premium"
              />
              <div className="absolute right-3 top-2.5 px-2.5 py-1 bg-[#121A2F] border border-[#2b3a61]/40 rounded-lg text-slate-400 text-xs font-mono font-bold uppercase tracking-wider shadow-inner">
                mm
              </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-1.5 block">Target finished wire sizing. Must be less than start.</span>
          </div>

          {/* Target Reduction/Pass */}
          <div>
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2">
              Pass Area Reduction (R_avg)
            </label>
            <div className="relative rounded-xl shadow-sm">
              <input 
                type="number" 
                step="0.5" 
                value={seqReduction}
                onChange={(e) => setSeqReduction(e.target.value)}
                className="w-full bg-[#050816] border border-[#1b253b] rounded-xl px-4 py-3.5 pr-14 text-white font-mono text-sm focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 focus:outline-none transition-premium"
              />
              <div className="absolute right-3 top-2.5 px-2.5 py-1 bg-[#121A2F] border border-[#2b3a61]/40 rounded-lg text-slate-400 text-xs font-mono font-bold uppercase tracking-wider shadow-inner">
                %
              </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-1.5 block">
              Target draft limit per die. High alloy/carbon steel drawings often use lower passes (10%-15%) to minimize fatigue.
            </span>
          </div>

          {/* Sequence Optimization Mode */}
          <div>
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2">
              Pass Optimization Mode
            </label>
            <div className="bg-[#050816] border border-[#1b253b] rounded-xl p-1 flex gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setSeqOptMode('constant')}
                className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-premium ${
                  seqOptMode === 'constant'
                    ? 'bg-[#121A2F] text-purple-400 border border-[#2b3a61]/65 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Constant Draft
              </button>
              <button
                type="button"
                onClick={() => setSeqOptMode('graduated')}
                className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-premium ${
                  seqOptMode === 'graduated'
                    ? 'bg-[#121A2F] text-purple-400 border border-[#2b3a61]/65 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Graduated (Optimized)
              </button>
            </div>
            <span className="text-[10px] text-slate-500 mt-1.5 block">
              {seqOptMode === 'constant'
                ? 'Reduction per pass remains constant. Ideal for uniform materials.'
                : 'Gradually reduces draft as wire work-hardens, preventing high-stress wire breakage.'}
            </span>
          </div>
          
          <button
            type="submit"
            className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-300 shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 mt-4 hover:-translate-y-0.5"
          >
            <Calculator className="h-4.5 w-4.5" />
            Generate Pass Sequence
          </button>
        </div>
      </form>

      {/* Sequence Output */}
      <div id="sequence-results" className="lg:col-span-8 bg-[#0D1325] border border-[#1b253b] rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-[#1b253b] pb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
            Sizing Sequence telemetry
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={exportSequenceCSV}
              className="px-3 py-1 bg-purple-600/90 hover:bg-purple-500 text-white text-[10px] font-bold rounded-lg transition duration-200 flex items-center gap-1 shadow"
            >
              <Table className="h-3.5 w-3.5" />
              Export CSV
            </button>
            <span className="text-[10px] font-mono text-slate-500">MATRIX // MULTI_PASS</span>
          </div>
        </div>

        {sequenceResults && sequenceResults.steps.length > 0 ? (
          <div className="space-y-6">
            {/* Sequence Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
              <div className="bg-[#121A2F] border border-[#1b253b] p-4 rounded-xl shadow-inner">
                <span className="text-[9px] text-slate-400 font-heading font-bold uppercase tracking-wider block mb-1">
                  Total Passes (Dies)
                </span>
                <div className="text-xl font-bold font-mono text-purple-400 flex items-baseline gap-1">
                  {sequenceResults.steps.length}
                  <span className="text-[9px] font-sans font-normal text-slate-500">STAGES</span>
                </div>
              </div>

              <div className="bg-[#121A2F] border border-[#1b253b] p-4 rounded-xl shadow-inner">
                <span className="text-[9px] text-slate-400 font-heading font-bold uppercase tracking-wider block mb-1">
                  Pass Drawing Ratio
                </span>
                <div className="text-xl font-bold font-mono text-indigo-400">
                  {(1 / (1 - parseFloat(seqReduction) / 100)).toFixed(3)}
                </div>
              </div>

              <div className="bg-[#121A2F] border border-[#1b253b] p-4 rounded-xl shadow-inner">
                <span className="text-[9px] text-slate-400 font-heading font-bold uppercase tracking-wider block mb-1">
                  Total Red. (R_cum)
                </span>
                <div className="text-xl font-bold font-mono text-blue-400">
                  {sequenceResults.totalReduction.toFixed(1)}%
                </div>
              </div>

              <div className="bg-[#121A2F] border border-[#1b253b] p-4 rounded-xl shadow-inner">
                <span className="text-[9px] text-slate-400 font-heading font-bold uppercase tracking-wider block mb-1">
                  Total Length strain
                </span>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  {((sequenceResults.totalElongation / 100) + 1).toFixed(2)}x
                </div>
              </div>
            </div>

            {/* Sizing sequence list */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 border border-[#1b253b] rounded-xl overflow-hidden shadow-inner">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#121A2F] border-b border-[#1b253b] text-slate-400 font-heading">
                        <th className="p-3 text-[10px] font-semibold uppercase tracking-widest">Pass</th>
                        <th className="p-3 text-[10px] font-semibold uppercase tracking-widest">Inlet Dia</th>
                        <th className="p-3 text-[10px] font-semibold uppercase tracking-widest text-center">Flow</th>
                        <th className="p-3 text-[10px] font-semibold uppercase tracking-widest">Outlet Dia</th>
                        <th className="p-3 text-[10px] font-semibold uppercase tracking-widest text-right">Draft Red.</th>
                        <th className="p-3 text-[10px] font-semibold uppercase tracking-widest text-right">Tension (N)</th>
                        <th className="p-3 text-[10px] font-semibold uppercase tracking-widest text-right">Stress (MPa)</th>
                        <th className="p-3 text-[10px] font-semibold uppercase tracking-widest text-right">Power (kW)</th>
                        <th className="p-3 text-[10px] font-semibold uppercase tracking-widest">Matched Die</th>
                        <th className="p-3 text-[10px] font-semibold uppercase tracking-widest text-right">Cum. Red.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1b253b]/50 font-mono text-xs text-slate-200">
                      {sequenceResults.steps.map((step: any) => {
                        // Calculate cumulative reduction at this pass
                        const currentArea = Math.PI * Math.pow(step.outlet / 2, 2)
                        const startArea = Math.PI * Math.pow(parseFloat(seqStart) / 2, 2)
                        const cumulativeRed = ((startArea - currentArea) / startArea) * 100

                        const limit = getMaterialLimit()
                        const isStepUnsafe = step.reduction > limit

                        // Calculate Physics values
                        const sigmaD = step.drawingStress || 0
                        const forceN = step.drawingForce || 0
                        const powerKw = step.power || 0
                        const isStressUnsafe = sigmaD >= 0.6 * parseFloat(uts)

                        return (
                          <tr key={step.draft} className={`transition-colors duration-150 group ${(isStepUnsafe || isStressUnsafe) ? 'bg-rose-950/15 hover:bg-rose-950/25 border-l-2 border-l-rose-500' : 'hover:bg-[#121A2F]/40'}`}>
                            <td className="p-3">
                              <span className={`w-5.5 h-5.5 rounded text-[9px] font-bold flex items-center justify-center transition-colors shadow-inner ${(isStepUnsafe || isStressUnsafe) ? 'bg-rose-950 border border-rose-500/40 text-rose-400' : 'bg-[#121A2F] border border-[#2b3a61]/65 text-slate-300 group-hover:border-purple-500/40 group-hover:text-purple-400'}`}>
                                #{step.draft}
                              </span>
                            </td>
                            <td className="p-3 text-slate-300">
                              {step.inlet.toFixed(3)}
                              <span className="text-[9px] text-slate-500 ml-1">mm</span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center justify-center w-5.5 h-5.5 rounded bg-[#050816] border border-[#1b253b] shadow-inner">
                                <ArrowRight className="h-3 w-3 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-premium" />
                              </div>
                            </td>
                            <td className="p-3 font-bold text-white">
                              {step.outlet.toFixed(3)}
                              <span className="text-[9px] text-slate-400 ml-1 font-normal">mm</span>
                            </td>
                            <td className={`p-3 text-right ${isStepUnsafe ? 'text-rose-400 font-bold' : 'text-blue-400'}`}>
                              <div className="flex items-center justify-end gap-1.5">
                                {isStepUnsafe && <Info className="h-3.5 w-3.5 text-rose-500 shrink-0" />}
                                <span>{step.reduction.toFixed(1)}%</span>
                              </div>
                            </td>
                            <td className="p-3 text-right text-indigo-300">
                              {forceN.toFixed(0)} <span className="text-[9px] text-slate-500">N</span>
                            </td>
                            <td className={`p-3 text-right ${isStressUnsafe ? 'text-rose-400 font-bold' : 'text-indigo-400'}`}>
                              <div className="flex items-center justify-end gap-1">
                                {isStressUnsafe && <Info className="h-3.5 w-3.5 text-rose-500 shrink-0" />}
                                <span>{sigmaD.toFixed(1)} <span className="text-[9px] text-slate-500 font-normal">MPa</span></span>
                              </div>
                            </td>
                            <td className="p-3 text-right text-emerald-400 font-semibold">
                              {powerKw.toFixed(2)} <span className="text-[9px] text-slate-500 font-normal">kW</span>
                            </td>
                            <td className="p-3">
                              {matchingDies[step.draft] ? (
                                <div className="flex flex-col gap-1">
                                  {matchingDies[step.draft].length > 0 ? (
                                    matchingDies[step.draft].map((die: any) => (
                                      <a
                                        key={die.die_id}
                                        href={`#/dies/${die.die_id}`}
                                        className={`inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                                          die.status === 'AVAILABLE'
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                            : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                                        }`}
                                      >
                                        {die.die_id} ({parseFloat(die.current_size).toFixed(3)}mm)
                                      </a>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-slate-500 font-mono">No matching dies</span>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => findMatchingDies(step.draft, step.outlet)}
                                  disabled={loadingDies[step.draft]}
                                  className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-[10px] font-bold rounded border border-blue-600/30 transition flex items-center gap-1 disabled:opacity-50"
                                >
                                  {loadingDies[step.draft] ? 'Searching...' : 'Find Die'}
                                </button>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2.5">
                                <div className="bg-[#050816] h-2 w-16 rounded-full overflow-hidden border border-[#1b253b] relative shadow-inner">
                                  <div
                                    className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${cumulativeRed}%` }}
                                  />
                                </div>
                                <span className="font-semibold text-slate-300 text-[10px] tracking-tight">
                                  {cumulativeRed.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SVG Visualizer on the right */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-[#121A2F] border border-[#1b253b] p-5 rounded-xl space-y-4 shadow-inner animate-fadeIn">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-heading flex items-center gap-2">
                    <Maximize2 className="h-4 w-4 text-blue-500" />
                    Draft Reduction Visualizer
                  </h4>
                  <div className="flex items-center justify-center bg-[#050816] rounded-lg p-6 border border-[#1b253b]/60 relative overflow-hidden">
                    <svg viewBox="0 0 200 200" className="w-48 h-48 drop-shadow-[0_0_12px_rgba(59,130,246,0.15)]">
                      <defs>
                        <pattern id="svg-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1b253b" strokeWidth="0.5" strokeOpacity="0.5" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#svg-grid)" />
                      
                      {/* Draw outer circle (start diameter) */}
                      <circle cx="100" cy="100" r={80} fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                      
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
                            fill={isLast ? 'rgba(59,130,246,0.15)' : 'none'}
                            stroke={isLast ? '#3b82f6' : `rgba(168, 85, 247, ${0.3 + (idx / sequenceResults.steps.length) * 0.7})`}
                            strokeWidth={isLast ? 2 : 1}
                            className="transition-all duration-500 ease-in-out"
                          />
                        )
                      })}
                      
                      {/* Core center point */}
                      <circle cx="100" cy="100" r="2" fill="#3b82f6" />
                    </svg>
                    
                    <div className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-500">
                      SCALE: 1px = {(parseFloat(seqStart) / 160).toFixed(4)} mm
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#050816] border border-[#1b253b] rounded-2xl py-20 px-6 flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-[#1b253b] flex items-center justify-center text-slate-500">
              <Info className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-300">Awaiting Sequence Range</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Please enter valid stock and target sizes in the configuration panel to plot the draw stage progression matrix.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
