import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings2,
  Play,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Thermometer,
  Activity,
  Zap,
  MapPin,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from 'lucide-react'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Skeleton } from '../../../components/ui/Skeleton'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { usePassOptimizer } from '../hooks/usePassOptimizer'
import { PassAssignmentInput } from '../types'
import type { DieStatus } from '../../../contracts/dieContracts'

const defaultInput: PassAssignmentInput = {
  startDia: 8.0,
  targetDia: 2.5,
  materialType: 'copper_soft',
  avgReduction: 20.0,
  optMode: 'constant',
  drawSpeed: 2.0,
  dieAngle: 7.0,
  lubrication: 'dry_soap',
  searchTolerance: 0.05,
}

export function PassOptimizerPage() {
  const [input, setInput] = useState<PassAssignmentInput>(defaultInput)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { results, loading, optimize, exportCSV } = usePassOptimizer()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    optimize(input)
  }

  const setField = <K extends keyof PassAssignmentInput>(key: K, val: PassAssignmentInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: val }))
  }

  const gaps = results?.passes.filter((p) => !p.assignment) ?? []

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[var(--color-bg)]">
      <PageHeader
        title="Pass Assignment Optimizer"
        subtitle="Auto-assign dies from inventory to drawing passes with physics-based stress analysis"
        breadcrumbs={[
          { label: 'Tools', href: '/tools' },
          { label: 'Pass Assignment' },
        ]}
        actions={
          results ? (
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          ) : undefined
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Panel */}
          <form onSubmit={handleSubmit} className="lg:col-span-4 space-y-4">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                  Drawing Parameters
                </h3>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>

              {/* Start / Target Diameters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase tracking-widest block mb-1.5">
                    Start d₀ (mm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={input.startDia}
                    onChange={(e) => setField('startDia', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-text)] font-mono text-sm focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase tracking-widest block mb-1.5">
                    Target dₙ (mm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={input.targetDia}
                    onChange={(e) => setField('targetDia', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-text)] font-mono text-sm focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Material */}
              <div>
                <label className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase tracking-widest block mb-1.5">
                  Material
                </label>
                <select
                  value={input.materialType}
                  onChange={(e) => setField('materialType', e.target.value as PassAssignmentInput['materialType'])}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-text)] font-mono text-sm focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-colors"
                >
                  <option value="copper_soft">Copper (Soft)</option>
                  <option value="copper_hard">Copper (Hard)</option>
                  <option value="aluminum">Aluminum</option>
                  <option value="steel_low">Steel (Low Carbon)</option>
                </select>
              </div>

              {/* Reduction & Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase tracking-widest block mb-1.5">
                    Avg Reduction %
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="5"
                    max="40"
                    value={input.avgReduction}
                    onChange={(e) => setField('avgReduction', parseFloat(e.target.value) || 20)}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-text)] font-mono text-sm focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase tracking-widest block mb-1.5">
                    Mode
                  </label>
                  <div className="flex border border-[var(--color-border)] rounded-lg overflow-hidden">
                    {(['constant', 'graduated'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setField('optMode', m)}
                        className={`flex-1 py-2.5 text-xs font-bold uppercase transition-colors ${
                          input.optMode === m
                            ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-400'
                            : 'text-[var(--color-muted)] hover:text-[var(--color-text)] border-b-2 border-transparent'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Search Tolerance */}
              <div>
                <label className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase tracking-widest block mb-1.5">
                  Search Tolerance ±(mm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="0.5"
                  value={input.searchTolerance}
                  onChange={(e) => setField('searchTolerance', parseFloat(e.target.value) || 0.05)}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-text)] font-mono text-sm focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-colors"
                />
              </div>

              {/* Advanced Toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase tracking-widest hover:text-[var(--color-text)] transition-colors"
              >
                <Settings2 className="h-3 w-3" />
                Physics Parameters
                {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase tracking-widest block mb-1.5">
                          Draw Speed (m/s)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="10"
                          value={input.drawSpeed}
                          onChange={(e) => setField('drawSpeed', parseFloat(e.target.value) || 2)}
                          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-text)] font-mono text-sm focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase tracking-widest block mb-1.5">
                          Die Half-Angle (°)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="2"
                          max="20"
                          value={input.dieAngle}
                          onChange={(e) => setField('dieAngle', parseFloat(e.target.value) || 7)}
                          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-text)] font-mono text-sm focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase tracking-widest block mb-1.5">
                        Lubrication
                      </label>
                      <select
                        value={input.lubrication}
                        onChange={(e) => setField('lubrication', e.target.value as PassAssignmentInput['lubrication'])}
                        className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[var(--color-text)] font-mono text-sm focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-colors"
                      >
                        <option value="hydrodynamic">Hydrodynamic (μ=0.02)</option>
                        <option value="dry_soap">Dry Soap (μ=0.04)</option>
                        <option value="wet_oil">Wet Oil (μ=0.06)</option>
                        <option value="boundary">Boundary (μ=0.10)</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Run Button */}
              <button
                type="submit"
                disabled={loading || input.startDia <= input.targetDia}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold py-3 px-4 rounded-xl transition-colors"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    Run Optimizer
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Results Panel */}
          <div className="lg:col-span-8 space-y-4">
            {!results && !loading && (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-16 text-center">
                <Activity className="h-10 w-10 text-[var(--color-border)] mx-auto mb-4" />
                <h3 className="text-sm font-bold text-[var(--color-text)] mb-2">No Results Yet</h3>
                <p className="text-xs text-[var(--color-muted)] max-w-md mx-auto">
                  Configure drawing parameters and run the optimizer to auto-assign dies from inventory
                  to each pass, with physics-based stress and temperature analysis.
                </p>
              </div>
            )}

            {loading && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-xl" />
                  ))}
                </div>
                <Skeleton className="h-64 rounded-xl" />
              </div>
            )}

            {results && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <SummaryCard
                    icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                    label="Dies Assigned"
                    value={`${results.assignedCount}/${results.passes.length}`}
                    accent={results.gapsCount === 0 ? 'emerald' : 'amber'}
                  />
                  <SummaryCard
                    icon={<Activity className="h-4 w-4 text-blue-400" />}
                    label="Total Reduction"
                    value={`${results.totalReduction.toFixed(1)}%`}
                    accent="blue"
                  />
                  <SummaryCard
                    icon={<Zap className="h-4 w-4 text-violet-400" />}
                    label="Peak Stress"
                    value={`${results.maxStress.toFixed(0)} MPa`}
                    accent="violet"
                  />
                  <SummaryCard
                    icon={<Thermometer className="h-4 w-4 text-rose-400" />}
                    label="Peak Temp Rise"
                    value={`${(results.maxTempRise * 1000).toFixed(1)} m°C`}
                    accent="rose"
                  />
                </div>

                {/* Gap Alerts */}
                {gaps.length > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        {gaps.length} Pass{gaps.length > 1 ? 'es' : ''} Without Matching Die
                      </h4>
                    </div>
                    <div className="space-y-1.5">
                      {gaps.map((g) => (
                        <div key={g.step.draft} className="flex items-center gap-3 text-xs">
                          <span className="font-mono font-bold text-amber-400 w-16">Pass {g.step.draft}</span>
                          <span className="text-[var(--color-muted)]">
                            Need: <span className="font-mono text-[var(--color-text)]">{g.step.outlet.toFixed(3)} mm</span>
                          </span>
                          <ArrowRight className="h-3 w-3 text-amber-400/50" />
                          <span className="text-amber-400/80">No die in inventory within tolerance</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Results Table */}
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[var(--color-border)]">
                          <th className="px-3 py-2.5 text-left font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">Pass</th>
                          <th className="px-3 py-2.5 text-left font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">Inlet</th>
                          <th className="px-3 py-2.5 text-left font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">Outlet</th>
                          <th className="px-3 py-2.5 text-left font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">Red %</th>
                          <th className="px-3 py-2.5 text-left font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">Stress</th>
                          <th className="px-3 py-2.5 text-left font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">Temp</th>
                          <th className="px-3 py-2.5 text-left font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">Burst</th>
                          <th className="px-3 py-2.5 text-left font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">Assigned Die</th>
                          <th className="px-3 py-2.5 text-left font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.passes.map((p) => (
                          <tr
                            key={p.step.draft}
                            className={`border-b border-[var(--color-border)]/50 ${
                              !p.assignment ? 'bg-amber-500/5' : ''
                            }`}
                          >
                            <td className="px-3 py-2.5 font-mono font-bold text-[var(--color-text)]">{p.step.draft}</td>
                            <td className="px-3 py-2.5 font-mono text-[var(--color-text)]">{p.step.inlet.toFixed(3)}</td>
                            <td className="px-3 py-2.5 font-mono text-[var(--color-text)]">{p.step.outlet.toFixed(3)}</td>
                            <td className="px-3 py-2.5 font-mono text-[var(--color-muted)]">{p.step.reduction.toFixed(1)}</td>
                            <td className="px-3 py-2.5">
                              <span className={`font-mono ${
                                p.drawStress > 300 ? 'text-rose-400' : p.drawStress > 200 ? 'text-amber-400' : 'text-emerald-400'
                              }`}>
                                {p.drawStress.toFixed(0)} MPa
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`font-mono ${
                                p.tempRise > 0.01 ? 'text-rose-400' : p.tempRise > 0.005 ? 'text-amber-400' : 'text-emerald-400'
                              }`}>
                                {(p.tempRise * 1000).toFixed(1)} m°C
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex items-center gap-1 font-mono font-bold ${
                                p.centralBurstRisk === 'danger' ? 'text-rose-400' :
                                p.centralBurstRisk === 'caution' ? 'text-amber-400' : 'text-emerald-400'
                              }`}>
                                {p.centralBurstRisk === 'safe' ? <CheckCircle2 className="h-3 w-3" /> :
                                 p.centralBurstRisk === 'caution' ? <AlertTriangle className="h-3 w-3" /> :
                                 <XCircle className="h-3 w-3" />}
                                {p.centralBurstRisk}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              {p.assignment ? (
                                <div className="flex items-center gap-1.5">
                                  <StatusBadge status={p.assignment.status as DieStatus} size="sm" />
                                  <span className="font-mono font-bold text-[var(--color-text)]">
                                    {p.assignment.die.die_id}
                                  </span>
                                  {p.assignment.sizeDelta > 0.02 && (
                                    <span className="text-[9px] font-mono text-amber-400">
                                      Δ{p.assignment.sizeDelta.toFixed(3)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-amber-400 font-bold">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              {p.assignment ? (
                                <span className="flex items-center gap-1 text-[var(--color-muted)]">
                                  <MapPin className="h-3 w-3" />
                                  {p.assignment.locationText}
                                </span>
                              ) : (
                                <span className="text-amber-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Power Summary */}
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">
                    Total Power Requirement
                  </span>
                  <span className="text-sm font-mono font-bold text-[var(--color-text)]">
                    {results.passes.reduce((sum, p) => sum + p.powerKw, 0).toFixed(2)} kW
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent: string
}) {
  const borderColors: Record<string, string> = {
    emerald: 'border-emerald-500/20',
    amber: 'border-amber-500/20',
    blue: 'border-blue-500/20',
    violet: 'border-violet-500/20',
    rose: 'border-rose-500/20',
  }
  return (
    <div className={`bg-[var(--color-surface)] border ${borderColors[accent] ?? 'border-[var(--color-border)]'} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-lg font-mono font-bold text-[var(--color-text)]">{value}</div>
    </div>
  )
}
