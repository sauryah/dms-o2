import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Layers,
  ArrowRight,
  Table,
  Info,
  Maximize2,
  FileSpreadsheet,
  FileText,
  Copy,
  Plus,
  Minus,
  Sparkles,
  TrendingDown,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'

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

  // Export functions
  exportSequenceCSV: () => void
  exportSequenceExcel?: () => void
  copySequenceClipboard?: () => Promise<void>

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
  exportSequenceExcel,
  copySequenceClipboard,
  matchingDies,
  loadingDies,
  findMatchingDies,
}: SequenceCalculatorProps) {
  const [activeViewTab, setActiveViewTab] = useState<'table' | 'chart' | 'circles'>('table')

  // Step adjustment helpers
  const adjustStart = (delta: number) => {
    const current = parseFloat(seqStart) || 8.0
    const updated = Math.max(0.2, current + delta)
    setSeqStart(updated.toFixed(2))
  }

  const adjustEnd = (delta: number) => {
    const current = parseFloat(seqEnd) || 2.5
    const updated = Math.max(0.05, current + delta)
    setSeqEnd(updated.toFixed(2))
  }

  const adjustReduction = (delta: number) => {
    const current = parseFloat(seqReduction) || 20.0
    const updated = Math.max(1, Math.min(99, current + delta))
    setSeqReduction(updated.toFixed(1))
  }

  return (
    <>
      {/* Left Column: Sequence Input Parameters */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          document.getElementById('sequence-results')?.scrollIntoView({ behavior: 'smooth' });
        }}
        className="lg:col-span-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 space-y-5 font-mono shadow-sm"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                01 SEQUENCE LIMITS
              </h3>
              <p className="text-[10px] text-[var(--color-muted)] m-0">
                Define wire inlet, target outlet & reduction
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/25 text-[9px] font-bold uppercase tracking-wider">
            MULTI_PASS
          </span>
        </div>

        <div className="space-y-4">
          {/* Start Stock Diameter */}
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-[var(--color-text)] uppercase tracking-wider">
                Start Stock Diameter (d₀)
              </label>
              <span className="text-[10px] text-[var(--color-muted)]">Entry Rod</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustStart(-0.5)}
                className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center transition cursor-pointer"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <div className="relative flex-1">
                <input 
                  type="number" 
                  step="0.01" 
                  value={seqStart}
                  onChange={(e) => setSeqStart(e.target.value)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-center text-sm font-bold text-[var(--color-text)] focus:border-purple-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-[10px] text-[var(--color-muted)] font-bold">
                  mm
                </span>
              </div>
              <button
                type="button"
                onClick={() => adjustStart(0.5)}
                className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Target End Diameter */}
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                Target Finished Size (d_n)
              </label>
              <span className="text-[10px] text-[var(--color-muted)]">Target Outlet</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustEnd(-0.1)}
                className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center transition cursor-pointer"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <div className="relative flex-1">
                <input 
                  type="number" 
                  step="0.01" 
                  value={seqEnd}
                  onChange={(e) => setSeqEnd(e.target.value)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-center text-sm font-bold text-purple-400 focus:border-purple-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-[10px] text-[var(--color-muted)] font-bold">
                  mm
                </span>
              </div>
              <button
                type="button"
                onClick={() => adjustEnd(0.1)}
                className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)] flex items-center justify-center transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Pass Area Reduction */}
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-[var(--color-text)] uppercase tracking-wider">
                Pass Area Reduction (R_avg)
              </label>
              <span className="text-[10px] text-[var(--color-muted)]">Safe Max: {getMaterialLimit()}%</span>
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
                  step="0.5" 
                  value={seqReduction}
                  onChange={(e) => setSeqReduction(e.target.value)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-center text-sm font-bold text-[var(--color-text)] focus:border-purple-500 focus:outline-none"
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

          {/* Pass Optimization Strategy Switcher */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider block">
              Draft Distribution Strategy
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-[var(--color-surface-2)] p-1 rounded-lg border border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setSeqOptMode('constant')}
                className={`py-2 px-2 rounded-md text-center transition cursor-pointer text-[10px] font-bold uppercase flex flex-col items-center gap-0.5 ${
                  seqOptMode === 'constant'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                <span>Constant Draft</span>
                <span className="text-[9px] opacity-75 font-normal">Uniform reduction</span>
              </button>
              <button
                type="button"
                onClick={() => setSeqOptMode('graduated')}
                className={`py-2 px-2 rounded-md text-center transition cursor-pointer text-[10px] font-bold uppercase flex flex-col items-center gap-0.5 ${
                  seqOptMode === 'graduated'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                <span>Graduated Draft</span>
                <span className="text-[9px] opacity-75 font-normal">Tapered skin passes</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Right Column: Sequence Telemetry, Chart & Data Table */}
      <div id="sequence-results" className="lg:col-span-8 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm space-y-5 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
              02 SIZING SEQUENCE SCHEDULE & CHARTS
            </h3>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switcher */}
            <div className="flex items-center gap-1 bg-[var(--color-surface-2)] p-1 rounded-lg border border-[var(--color-border)] text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setActiveViewTab('table')}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${
                  activeViewTab === 'table' ? 'bg-purple-600 text-white' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                Schedule Table
              </button>
              <button
                type="button"
                onClick={() => setActiveViewTab('chart')}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${
                  activeViewTab === 'chart' ? 'bg-purple-600 text-white' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                Reduction Chart
              </button>
              <button
                type="button"
                onClick={() => setActiveViewTab('circles')}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${
                  activeViewTab === 'circles' ? 'bg-purple-600 text-white' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                Die Progression
              </button>
            </div>

            {/* Export Actions */}
            {sequenceResults && sequenceResults.steps.length > 0 && (
              <div className="flex items-center gap-1">
                {exportSequenceExcel && (
                  <button
                    type="button"
                    onClick={exportSequenceExcel}
                    className="p-1.5 rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] text-[var(--color-text)] transition cursor-pointer border border-[var(--color-border)]"
                    title="Export Excel (.xlsx)"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={exportSequenceCSV}
                  className="p-1.5 rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] text-[var(--color-text)] transition cursor-pointer border border-[var(--color-border)]"
                  title="Export CSV"
                >
                  <FileText className="h-3.5 w-3.5 text-blue-400" />
                </button>
                {copySequenceClipboard && (
                  <button
                    type="button"
                    onClick={copySequenceClipboard}
                    className="p-1.5 rounded-lg bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] text-[var(--color-text)] transition cursor-pointer border border-[var(--color-border)]"
                    title="Copy to Clipboard"
                  >
                    <Copy className="h-3.5 w-3.5 text-purple-400" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {sequenceResults && sequenceResults.steps.length > 0 ? (
          <div className="space-y-5">
            {/* Cumulative Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3.5 rounded-xl">
                <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block mb-1">
                  Total Passes
                </span>
                <div className="text-lg font-bold font-mono text-purple-400 tabular-nums">
                  {sequenceResults.steps.length} <span className="text-xs text-[var(--color-muted)]">DIES</span>
                </div>
              </div>

              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3.5 rounded-xl">
                <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block mb-1">
                  Overall Area Loss
                </span>
                <div className="text-lg font-bold font-mono text-cyan-400 tabular-nums">
                  {sequenceResults.totalReduction.toFixed(1)}%
                </div>
              </div>

              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3.5 rounded-xl">
                <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block mb-1">
                  Length Multiplier
                </span>
                <div className="text-lg font-bold font-mono text-emerald-400 tabular-nums">
                  {((sequenceResults.totalElongation / 100) + 1).toFixed(2)}x
                </div>
              </div>

              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3.5 rounded-xl">
                <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block mb-1">
                  Total Power Demand
                </span>
                <div className="text-lg font-bold font-mono text-amber-400 tabular-nums">
                  {sequenceResults.steps.reduce((sum: number, s: any) => sum + (s.power || 0), 0).toFixed(2)} <span className="text-xs text-[var(--color-muted)]">kW</span>
                </div>
              </div>
            </div>

            {/* TAB 1: Schedule Table View */}
            {activeViewTab === 'table' && (
              <div className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-bg)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)] text-[var(--color-muted)] uppercase tracking-wider text-[10px]">
                        <th className="p-3">Pass</th>
                        <th className="p-3">Inlet (mm)</th>
                        <th className="p-3 text-center">Flow</th>
                        <th className="p-3">Outlet (mm)</th>
                        <th className="p-3 text-right">Draft %</th>
                        <th className="p-3 text-right">Ratio (λ)</th>
                        <th className="p-3 text-right">Pull Force</th>
                        <th className="p-3 text-right">Power</th>
                        <th className="p-3 text-center">Stock Match</th>
                        <th className="p-3 text-right">Cum. %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text)]">
                      {sequenceResults.steps.map((step: any) => {
                        const currentArea = Math.PI * Math.pow(step.outlet / 2, 2)
                        const startArea = Math.PI * Math.pow(parseFloat(seqStart) / 2, 2)
                        const cumulativeRed = ((startArea - currentArea) / startArea) * 100

                        const limit = getMaterialLimit()
                        const isStepUnsafe = step.reduction > limit
                        const forceN = step.drawingForce || 0
                        const powerKw = step.power || 0

                        return (
                          <tr key={step.draft} className={`hover:bg-[var(--color-surface-2)] transition-colors ${isStepUnsafe ? 'bg-rose-500/10' : ''}`}>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                Pass #{step.draft}
                              </span>
                            </td>
                            <td className="p-3 text-[var(--color-muted)] tabular-nums">
                              {step.inlet.toFixed(3)}
                            </td>
                            <td className="p-3 text-center">
                              <ArrowRight className="h-3.5 w-3.5 text-[var(--color-muted)] mx-auto" />
                            </td>
                            <td className="p-3 font-bold text-[var(--color-text)] tabular-nums">
                              {step.outlet.toFixed(3)}
                            </td>
                            <td className={`p-3 text-right tabular-nums font-bold ${isStepUnsafe ? 'text-rose-400' : 'text-blue-400'}`}>
                              {step.reduction.toFixed(1)}%
                            </td>
                            <td className="p-3 text-right text-[var(--color-muted)] tabular-nums font-semibold">
                              {step.drawingRatio.toFixed(3)}x
                            </td>
                            <td className="p-3 text-right text-amber-400 tabular-nums">
                              {(forceN / 1000).toFixed(2)} kN
                            </td>
                            <td className="p-3 text-right text-emerald-400 tabular-nums font-semibold">
                              {powerKw.toFixed(2)} kW
                            </td>
                            <td className="p-3 text-center">
                              {matchingDies[step.draft] ? (
                                matchingDies[step.draft].length > 0 ? (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    {matchingDies[step.draft][0].die_id}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-[var(--color-muted)]">No match</span>
                                )
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => findMatchingDies(step.draft, step.outlet)}
                                  disabled={loadingDies[step.draft]}
                                  className="px-2 py-0.5 bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] text-blue-400 text-[10px] font-bold rounded border border-[var(--color-border)] transition cursor-pointer disabled:opacity-50"
                                >
                                  {loadingDies[step.draft] ? '...' : 'Scan'}
                                </button>
                              )}
                            </td>
                            <td className="p-3 text-right tabular-nums text-[var(--color-muted)]">
                              {cumulativeRed.toFixed(1)}%
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: Reduction & Elongation Chart View */}
            {activeViewTab === 'chart' && (
              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[var(--color-text)] uppercase">Pass-by-Pass Reduction Profile</span>
                  <span className="text-[10px] text-[var(--color-muted)]">Target: ~{seqReduction}% per draft</span>
                </div>

                {/* SVG Bar Chart */}
                <div className="space-y-3 pt-2">
                  {sequenceResults.steps.map((step: any) => {
                    const widthPct = Math.min(100, (step.reduction / 40) * 100)
                    const limit = getMaterialLimit()
                    const isUnsafe = step.reduction > limit

                    return (
                      <div key={step.draft} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-[var(--color-muted)]">
                            Pass #{step.draft} ({step.inlet.toFixed(2)} → {step.outlet.toFixed(2)} mm)
                          </span>
                          <span className={`font-bold ${isUnsafe ? 'text-rose-400' : 'text-blue-400'}`}>
                            {step.reduction.toFixed(2)}% Area Red. (+{step.elongation.toFixed(2)}% Elong.)
                          </span>
                        </div>
                        <div className="w-full h-3 bg-[var(--color-surface-2)] rounded-md overflow-hidden flex">
                          <div 
                            className={`h-full rounded-md transition-all duration-500 ${isUnsafe ? 'bg-rose-500' : 'bg-blue-500'}`}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: Die Progression Concentric Wire Rings */}
            {activeViewTab === 'circles' && (
              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-5 flex flex-col items-center justify-center space-y-4">
                <div className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                  Concentric Die Wire Cross-Sections ({sequenceResults.steps.length} Passes)
                </div>
                <svg viewBox="0 0 300 300" className="w-64 h-64">
                  {/* Grid Crosshair */}
                  <line x1="150" y1="20" x2="150" y2="280" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="20" y1="150" x2="280" y2="150" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3 3" />
                  
                  {/* Outer initial wire */}
                  <circle cx="150" cy="150" r={120} fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 2" />

                  {/* Progressive die rings */}
                  {sequenceResults.steps.map((step: any, idx: number) => {
                    const maxDia = parseFloat(seqStart)
                    const radius = (step.outlet / maxDia) * 120
                    const isLast = idx === sequenceResults.steps.length - 1
                    
                    return (
                      <circle
                        key={step.draft}
                        cx="150"
                        cy="150"
                        r={radius}
                        fill={isLast ? 'rgba(139,92,246,0.15)' : 'none'}
                        stroke={isLast ? '#a855f7' : '#3b82f6'}
                        strokeWidth={isLast ? 2.5 : 1}
                        strokeOpacity={0.4 + (idx / sequenceResults.steps.length) * 0.6}
                      />
                    )
                  })}

                  <circle cx="150" cy="150" r="3" fill="#a855f7" />
                </svg>
                <div className="text-[11px] text-[var(--color-muted)] text-center font-mono">
                  Starting raw stock: <span className="text-[var(--color-text)] font-bold">{parseFloat(seqStart).toFixed(2)} mm</span> → Final finished wire: <span className="text-purple-400 font-bold">{parseFloat(seqEnd).toFixed(3)} mm</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl py-16 px-4 flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-muted)]">
              <Info className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[var(--color-text)] uppercase">Awaiting Sequence Range</h4>
              <p className="text-xs text-[var(--color-muted)]">
                Enter stock and target sizes in the left panel to plot the draw stage progression matrix.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
