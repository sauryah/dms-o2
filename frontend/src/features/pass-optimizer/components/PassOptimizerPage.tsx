import React, { useState } from 'react'
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
    <div className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] text-[#e4e4e4] font-mono">
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
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono uppercase rounded-sm bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-blue-500" />
              Export CSV
            </button>
          ) : undefined
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 font-mono">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Panel */}
          <form onSubmit={handleSubmit} className="lg:col-span-4 space-y-4">
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 space-y-4 font-mono">
              <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-2">
                <h3 className="text-xs font-bold text-[#e4e4e4] uppercase tracking-wider">
                  01 DRAWING PARAMETERS
                </h3>
                <span className="px-1.5 py-0.2 rounded-sm bg-[#141414] text-emerald-400 border border-emerald-500/30 text-[9px] font-mono uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  LIVE
                </span>
              </div>

              {/* Start / Target Diameters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
                    Start d₀ (mm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={input.startDia}
                    onChange={(e) => setField('startDia', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-2.5 py-1.5 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
                    Target dₙ (mm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={input.targetDia}
                    onChange={(e) => setField('targetDia', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-2.5 py-1.5 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Material */}
              <div>
                <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
                  Material
                </label>
                <select
                  value={input.materialType}
                  onChange={(e) => setField('materialType', e.target.value as PassAssignmentInput['materialType'])}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-2.5 py-1.5 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none uppercase cursor-pointer"
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
                  <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
                    Avg Reduction %
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="5"
                    max="40"
                    value={input.avgReduction}
                    onChange={(e) => setField('avgReduction', parseFloat(e.target.value) || 20)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-2.5 py-1.5 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
                    Mode
                  </label>
                  <div className="flex border border-[#2a2a2a] rounded-sm overflow-hidden p-0.5 bg-[#0a0a0a]">
                    {(['constant', 'graduated'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setField('optMode', m)}
                        className={`flex-1 py-1 text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                          input.optMode === m
                            ? 'bg-[#141414] text-emerald-400 border border-emerald-500/30'
                            : 'text-[#6b7280] hover:text-[#e4e4e4]'
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
                <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
                  Search Tolerance ±(mm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="0.5"
                  value={input.searchTolerance}
                  onChange={(e) => setField('searchTolerance', parseFloat(e.target.value) || 0.05)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-2.5 py-1.5 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Advanced Toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-[10px] font-mono text-[#6b7280] uppercase tracking-widest hover:text-[#e4e4e4] transition-colors cursor-pointer"
              >
                <Settings2 className="h-3 w-3" />
                Physics Parameters
                {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {showAdvanced && (
                <div className="space-y-3 pt-2 border-t border-[#1a1a1a]">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
                        Draw Speed (m/s)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="10"
                        value={input.drawSpeed}
                        onChange={(e) => setField('drawSpeed', parseFloat(e.target.value) || 2)}
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-2.5 py-1.5 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
                        Die Half-Angle (°)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="2"
                        max="20"
                        value={input.dieAngle}
                        onChange={(e) => setField('dieAngle', parseFloat(e.target.value) || 7)}
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-2.5 py-1.5 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest block mb-1">
                      Lubrication
                    </label>
                    <select
                      value={input.lubrication}
                      onChange={(e) => setField('lubrication', e.target.value as PassAssignmentInput['lubrication'])}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-2.5 py-1.5 text-[#e4e4e4] font-mono text-xs focus:border-blue-500 focus:outline-none uppercase cursor-pointer"
                    >
                      <option value="hydrodynamic">Hydrodynamic (μ=0.02)</option>
                      <option value="dry_soap">Dry Soap (μ=0.04)</option>
                      <option value="wet_oil">Wet Oil (μ=0.06)</option>
                      <option value="boundary">Boundary (μ=0.10)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Run Button */}
              <button
                type="submit"
                disabled={loading || input.startDia <= input.targetDia}
                className="w-full flex items-center justify-center gap-1.5 bg-[#141414] hover:bg-[#1f1f1f] disabled:opacity-40 border border-emerald-500/50 text-emerald-400 hover:text-emerald-300 text-xs font-mono uppercase font-bold py-2 px-3 rounded-sm transition cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border border-emerald-400 border-t-transparent animate-spin" />
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
          <div className="lg:col-span-8 space-y-4 font-mono">
            {!results && !loading && (
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-12 text-center">
                <Activity className="h-8 w-8 text-[#404040] mx-auto mb-2" />
                <h3 className="text-xs font-bold uppercase text-[#e4e4e4] mb-1">No Results Yet</h3>
                <p className="text-xs text-[#6b7280] max-w-md mx-auto">
                  Configure drawing parameters and run optimizer to auto-assign dies from inventory.
                </p>
              </div>
            )}

            {loading && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-sm bg-[#141414]" />
                  ))}
                </div>
                <Skeleton className="h-64 rounded-sm bg-[#141414]" />
              </div>
            )}

            {results && !loading && (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <SummaryCard
                    icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                    label="Dies Assigned"
                    value={`${results.assignedCount}/${results.passes.length}`}
                    accent={results.gapsCount === 0 ? 'emerald' : 'amber'}
                  />
                  <SummaryCard
                    icon={<Activity className="h-3.5 w-3.5 text-blue-400" />}
                    label="Total Reduction"
                    value={`${results.totalReduction.toFixed(1)}%`}
                    accent="blue"
                  />
                  <SummaryCard
                    icon={<Zap className="h-3.5 w-3.5 text-purple-400" />}
                    label="Peak Stress"
                    value={`${results.maxStress.toFixed(0)} MPa`}
                    accent="violet"
                  />
                  <SummaryCard
                    icon={<Thermometer className="h-3.5 w-3.5 text-red-400" />}
                    label="Peak Temp Rise"
                    value={`${(results.maxTempRise * 1000).toFixed(1)} m°C`}
                    accent="rose"
                  />
                </div>

                {/* Gap Alerts */}
                {gaps.length > 0 && (
                  <div className="bg-[#141414] border border-amber-500/30 rounded-sm p-3 font-mono">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                      <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        {gaps.length} Pass{gaps.length > 1 ? 'es' : ''} Without Matching Die
                      </h4>
                    </div>
                    <div className="space-y-1">
                      {gaps.map((g) => (
                        <div key={g.step.draft} className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-amber-400 w-16">Pass {g.step.draft}</span>
                          <span className="text-[#6b7280]">
                            Need: <span className="font-mono text-[#e4e4e4]">{g.step.outlet.toFixed(3)} mm</span>
                          </span>
                          <ArrowRight className="h-3 w-3 text-[#6b7280]" />
                          <span className="text-amber-400">No die in inventory within tolerance</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Results Table */}
                <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm overflow-hidden font-mono">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-[#1a1a1a] bg-[#0a0a0a] text-[#6b7280] uppercase tracking-wider">
                          <th className="px-3 py-2">Pass</th>
                          <th className="px-3 py-2">Inlet</th>
                          <th className="px-3 py-2">Outlet</th>
                          <th className="px-3 py-2">Red %</th>
                          <th className="px-3 py-2">Stress</th>
                          <th className="px-3 py-2">Temp</th>
                          <th className="px-3 py-2">Burst</th>
                          <th className="px-3 py-2">Assigned Die</th>
                          <th className="px-3 py-2">Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1a1a1a] text-[#e4e4e4]">
                        {results.passes.map((p) => (
                          <tr
                            key={p.step.draft}
                            className={`hover:bg-[#141414] transition-colors ${
                              !p.assignment ? 'bg-amber-950/15' : ''
                            }`}
                          >
                            <td className="px-3 py-2 font-bold tabular-nums">{p.step.draft}</td>
                            <td className="px-3 py-2 text-[#6b7280] tabular-nums">{p.step.inlet.toFixed(3)}</td>
                            <td className="px-3 py-2 font-bold tabular-nums">{p.step.outlet.toFixed(3)}</td>
                            <td className="px-3 py-2 text-blue-400 tabular-nums">{p.step.reduction.toFixed(1)}%</td>
                            <td className="px-3 py-2 tabular-nums">
                              <span className={`${
                                p.drawStress > 300 ? 'text-red-400' : p.drawStress > 200 ? 'text-amber-400' : 'text-emerald-400'
                              }`}>
                                {p.drawStress.toFixed(0)} MPa
                              </span>
                            </td>
                            <td className="px-3 py-2 tabular-nums text-[#6b7280]">
                              {(p.tempRise * 1000).toFixed(1)} m°C
                            </td>
                            <td className="px-3 py-2 uppercase font-bold">
                              <span className={`inline-flex items-center gap-1 ${
                                p.centralBurstRisk === 'danger' ? 'text-red-400' :
                                p.centralBurstRisk === 'caution' ? 'text-amber-400' : 'text-emerald-400'
                              }`}>
                                {p.centralBurstRisk === 'safe' ? <CheckCircle2 className="h-3 w-3" /> :
                                 p.centralBurstRisk === 'caution' ? <AlertTriangle className="h-3 w-3" /> :
                                 <XCircle className="h-3 w-3" />}
                                {p.centralBurstRisk}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {p.assignment ? (
                                <div className="flex items-center gap-1.5">
                                  <StatusBadge status={p.assignment.status as DieStatus} size="sm" />
                                  <span className="font-bold text-blue-400">
                                    {p.assignment.die.die_id}
                                  </span>
                                  {p.assignment.sizeDelta > 0.02 && (
                                    <span className="text-[9px] text-amber-400">
                                      Δ{p.assignment.sizeDelta.toFixed(3)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-amber-400 font-bold">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {p.assignment ? (
                                <span className="flex items-center gap-1 text-[#6b7280]">
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
                <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-3 flex items-center justify-between font-mono">
                  <span className="text-xs text-[#6b7280] uppercase tracking-wider">
                    Total Power Requirement
                  </span>
                  <span className="text-sm font-bold text-emerald-400 tabular-nums">
                    {results.passes.reduce((sum, p) => sum + p.powerKw, 0).toFixed(2)} kW
                  </span>
                </div>
              </div>
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
  accent: _accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-3 font-mono">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-[#6b7280] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-lg font-mono font-bold text-[#e4e4e4] tabular-nums">{value}</div>
    </div>
  )
}
