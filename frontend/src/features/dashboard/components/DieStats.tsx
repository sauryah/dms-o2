import React from 'react'
import { Info } from 'lucide-react'
import { isDieActive } from '../../../utils/dieHelpers'
import type { Die } from '../../../types'

interface DieStatsProps {
  totalSets: number
  totalDies: number
  dies: Die[]
}

export function DieStats({
  totalSets,
  totalDies,
  dies,
}: DieStatsProps) {
  const activeDies = dies.filter(isDieActive).length
  const inactiveDies = totalDies - activeDies

  return (
    <div className="font-mono">
      <h3 className="text-xs font-medium text-[#6b7280] uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Info className="h-3.5 w-3.5 text-blue-500" />
        <span>01 SUMMARY STATISTICS</span>
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Sets Card */}
        <div className="bg-[#0f0f0f] rounded-sm p-3.5 flex flex-col justify-between border border-[#1a1a1a] stat-card stat-card-TOTAL">
          <span className="text-[#6b7280] text-[10px] uppercase tracking-wider font-semibold stat-label">TOTAL SETS</span>
          <span className="text-xl font-bold font-mono text-[#e4e4e4] tabular-nums mt-1 stat-count">{totalSets}</span>
        </div>

        {/* Total Dies Card */}
        <div className="bg-[#0f0f0f] rounded-sm p-3.5 flex flex-col justify-between border border-[#1a1a1a] stat-card stat-card-TOTAL">
          <span className="text-[#6b7280] text-[10px] uppercase tracking-wider font-semibold stat-label">TOTAL DIES</span>
          <span className="text-xl font-bold font-mono text-[#e4e4e4] tabular-nums mt-1 stat-count">{totalDies}</span>
        </div>

        {/* Active Dies Card */}
        <div className="bg-[#0f0f0f] rounded-sm p-3.5 flex flex-col justify-between border border-[#1a1a1a] border-l-2 border-l-[#10b981] stat-card stat-card-AVAILABLE">
          <span className="text-[#6b7280] text-[10px] uppercase tracking-wider font-semibold stat-label">ACTIVE DIES</span>
          <span className="text-xl font-bold font-mono text-emerald-400 tabular-nums mt-1 stat-count">
            {activeDies}
          </span>
        </div>

        {/* Inactive Dies Card */}
        <div className="bg-[#0f0f0f] rounded-sm p-3.5 flex flex-col justify-between border border-[#1a1a1a] border-l-2 border-l-[#ef4444] stat-card stat-card-DAMAGED">
          <span className="text-[#6b7280] text-[10px] uppercase tracking-wider font-semibold stat-label">INACTIVE DIES</span>
          <span className="text-xl font-bold font-mono text-red-400 tabular-nums mt-1 stat-count">
            {inactiveDies}
          </span>
        </div>
      </div>
    </div>
  )
}
