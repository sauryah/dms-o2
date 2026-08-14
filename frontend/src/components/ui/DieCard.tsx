import React from 'react'
import { StatusBadge } from './StatusBadge'
import { Hash, MapPin, Box, Database, Cpu } from 'lucide-react'

export interface DieCardProps {
  die: any
  onClick?: () => void
  viewMode?: 'grid' | 'list'
}

export const DieCard = React.memo(function DieCard({ die, onClick, viewMode = 'grid' }: DieCardProps) {
  const isRound = die.die_type === 'ROUND'
  const sizeText = isRound
    ? `${parseFloat(die.current_size || 0).toFixed(3)} mm`
    : `${parseFloat(die.current_width || 0).toFixed(3)} × ${parseFloat(die.current_thickness || 0).toFixed(3)} mm`

  const locationText = die.rack_name && die.shelf
    ? `${die.rack_name} - S${die.shelf}`
    : die.location || 'Unassigned'

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }

  if (viewMode === 'list') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className={`w-full bg-[#0f0f0f] hover:bg-[#141414] border border-[#1a1a1a] rounded-sm px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors duration-100 cursor-pointer focus-ring select-none border-l-2 ${
          isRound ? 'border-l-blue-500' : 'border-l-purple-500'
        }`}
      >
        <div className="flex items-center space-x-4">
          <div className="font-mono text-sm font-bold text-[#e4e4e4] tabular-nums">
            {sizeText}
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#6b7280] font-mono">
            <span className="flex items-center">
              <Hash className="h-3 w-3 mr-1 text-[#404040]" />
              {die.die_id}
            </span>
            <span className="text-[#404040]">·</span>
            <span className="flex items-center">
              <Box className="h-3 w-3 mr-1 text-[#404040]" />
              {die.casing || 'N/A'}
            </span>
            <span className="text-[#404040]">·</span>
            <span className="flex items-center">
              <MapPin className="h-3 w-3 mr-1 text-[#404040]" />
              {locationText}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 border-[#1a1a1a] pt-2 sm:pt-0">
          <div className="flex items-center space-x-2 text-xs text-[#6b7280] font-mono">
            <span className="flex items-center">
              <Database className="h-3 w-3 mr-1 text-[#404040]" />
              {die.set_name || 'No Set'}
            </span>
            {die.machine_name && (
              <>
                <span className="text-[#404040]">·</span>
                <span className="flex items-center">
                  <Cpu className="h-3 w-3 mr-1 text-[#404040]" />
                  {die.machine_name}
                </span>
              </>
            )}
          </div>
          <StatusBadge status={die.status} />
        </div>
      </div>
    )
  }

  // Default Grid Layout
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`bg-[#0f0f0f] hover:bg-[#141414] border border-[#1a1a1a] rounded-sm p-3.5 flex flex-col justify-between h-40 transition-colors duration-100 cursor-pointer focus-ring select-none border-l-2 ${
        isRound ? 'border-l-blue-500' : 'border-l-purple-500'
      }`}
    >
      <div className="space-y-2">
        {/* Monospace Primary Line */}
        <div className="font-mono text-base font-bold text-[#e4e4e4] tabular-nums tracking-tight">
          {sizeText}
        </div>

        {/* Secondary Info Line */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#6b7280] font-mono uppercase">
          <span className="flex items-center">
            <Hash className="h-3 w-3 mr-0.5 text-[#404040] shrink-0" />
            {die.die_id}
          </span>
          <span className="text-[#404040]">·</span>
          <span className="flex items-center">
            <Box className="h-3 w-3 mr-0.5 text-[#404040] shrink-0" />
            {die.casing || 'N/A'}
          </span>
          <span className="text-[#404040]">·</span>
          <span className="flex items-center">
            <MapPin className="h-3 w-3 mr-0.5 text-[#404040] shrink-0" />
            <span className="truncate max-w-[110px]" title={locationText}>{locationText}</span>
          </span>
        </div>
      </div>

      {/* Footer Row */}
      <div className="border-t border-[#1a1a1a] pt-2.5 flex items-center justify-between gap-2 mt-auto">
        <div className="flex flex-col text-[10px] text-[#6b7280] uppercase tracking-wider font-mono min-w-0">
          <span className="truncate flex items-center">
            <Database className="h-3 w-3 mr-1 text-[#404040] shrink-0" />
            {die.set_name || 'No Set'}
          </span>
          {die.machine_name && (
            <span className="truncate flex items-center mt-0.5">
              <Cpu className="h-3 w-3 mr-1 text-[#404040] shrink-0" />
              {die.machine_name}
            </span>
          )}
        </div>
        <div className="shrink-0">
          <StatusBadge status={die.status} />
        </div>
      </div>
    </div>
  )
})
