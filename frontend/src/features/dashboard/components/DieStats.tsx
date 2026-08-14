import React from 'react'
import { Info } from 'lucide-react'
import { isDieActive } from '../../../utils/dieHelpers'

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
    <div className="font-mono">
      <h3 className="text-xs font-medium text-[#6b7280] uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Info className="h-3.5 w-3.5 text-blue-500" />
        <span>01 SUMMARY STATISTICS</span>
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Sets Card */}
        <div className="bg-[#0f0f0f] rounded-sm p-3.5 flex flex-col justify-between border border-[#1a1a1a]">
          <span className="text-[#6b7280] text-[10px] uppercase tracking-wider">TOTAL SETS</span>
          <span className="text-xl font-bold font-mono text-[#e4e4e4] tabular-nums mt-1">{totalSets}</span>
        </div>

        {/* Total Dies Card */}
        <div className="bg-[#0f0f0f] rounded-sm p-3.5 flex flex-col justify-between border border-[#1a1a1a]">
          <span className="text-[#6b7280] text-[10px] uppercase tracking-wider">TOTAL DIES</span>
          <span className="text-xl font-bold font-mono text-[#e4e4e4] tabular-nums mt-1">{totalDies}</span>
        </div>

        {/* Active Dies Card */}
        <div className="bg-[#0f0f0f] rounded-sm p-3.5 flex flex-col justify-between border border-[#1a1a1a] border-l-2 border-l-[#10b981]">
          <span className="text-[#6b7280] text-[10px] uppercase tracking-wider font-medium">ACTIVE DIES</span>
          <span className="text-xl font-bold font-mono text-emerald-400 tabular-nums mt-1">
            {activeDies}
          </span>
        </div>

        {/* Inactive Dies Card */}
        <div className="bg-[#0f0f0f] rounded-sm p-3.5 flex flex-col justify-between border border-[#1a1a1a] border-l-2 border-l-[#ef4444]">
          <span className="text-[#6b7280] text-[10px] uppercase tracking-wider font-medium">INACTIVE DIES</span>
          <span className="text-xl font-bold font-mono text-red-400 tabular-nums mt-1">
            {inactiveDies}
          </span>
        </div>
      </div>
    </div>
  )
}
