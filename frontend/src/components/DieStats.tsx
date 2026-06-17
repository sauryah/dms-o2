import React from 'react'
import { Info } from 'lucide-react'
import { isDieActive } from '../App'

interface DieStatsProps {
  totalSets: number
  totalDies: number
  dies: any[]
}

export function DieStats({
  totalSets,
  totalDies,
  dies,
}: DieStatsProps) {
  const activeDies = dies.filter(isDieActive).length
  const inactiveDies = totalDies - activeDies

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Info className="h-4 w-4 text-blue-500" />
        <span>Summary Statistics</span>
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Sets Card */}
        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid hover:border-blue-500/20 hover:-translate-y-0.5 transition-all duration-300">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider relative z-10">Total Sets</span>
          <span className="text-2xl md:text-3xl font-black text-white mt-2 relative z-10 font-heading">{totalSets}</span>
        </div>

        {/* Total Dies Card */}
        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid hover:border-blue-500/20 hover:-translate-y-0.5 transition-all duration-300">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider relative z-10">Total Dies</span>
          <span className="text-2xl md:text-3xl font-black text-white mt-2 relative z-10 font-heading">{totalDies}</span>
        </div>

        {/* Active Dies Card */}
        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-emerald hover:border-emerald-500/20 hover:-translate-y-0.5 transition-all duration-300">
          <span className="text-slate-450 text-xs font-semibold uppercase tracking-wider relative z-10 font-bold">Active Dies</span>
          <span className="text-2xl md:text-3xl font-black text-emerald-400 mt-2 relative z-10 font-heading">
            {activeDies}
          </span>
        </div>

        {/* Inactive Dies Card */}
        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-rose hover:border-rose-500/20 hover:-translate-y-0.5 transition-all duration-300">
          <span className="text-slate-455 text-xs font-semibold uppercase tracking-wider relative z-10 font-bold">Inactive Dies</span>
          <span className="text-2xl md:text-3xl font-black text-rose-450 mt-2 relative z-10 font-heading">
            {inactiveDies}
          </span>
        </div>
      </div>
    </div>
  )
}
