import React from 'react'
import { StatusBadge } from './StatusBadge'
import { Hash, MapPin, Box, Database, Cpu } from 'lucide-react'

export interface DieCardProps {
  die: any
  onClick?: () => void
  viewMode?: 'grid' | 'list'
}

export function DieCard({ die, onClick, viewMode = 'grid' }: DieCardProps) {
  const isRound = die.die_type === 'ROUND'
  const sizeText = isRound
    ? `${parseFloat(die.current_size || 0).toFixed(3)} mm`
    : `${parseFloat(die.current_width || 0).toFixed(3)} × ${parseFloat(die.current_thickness || 0).toFixed(3)} mm`

  const locationText = die.rack_name && die.shelf
    ? `${die.rack_name} - S${die.shelf}`
    : die.location || 'Unassigned'

  if (viewMode === 'list') {
    return (
      <div 
        onClick={onClick}
        className={`w-full bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors duration-150 cursor-pointer focus-ring select-none border-l-4 ${
          isRound ? 'border-l-blue-500' : 'border-l-purple-500'
        }`}
      >
        <div className="flex items-center space-x-4">
          <div className="font-mono text-base font-bold text-[var(--color-text)]">
            {sizeText}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)] font-semibold">
            <span className="flex items-center">
              <Hash className="h-3 w-3 mr-1" />
              {die.die_id}
            </span>
            <span>·</span>
            <span className="flex items-center">
              <Box className="h-3 w-3 mr-1" />
              {die.casing || 'N/A'}
            </span>
            <span>·</span>
            <span className="flex items-center">
              <MapPin className="h-3 w-3 mr-1" />
              {locationText}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 border-[var(--color-border)] pt-2 sm:pt-0">
          <div className="flex items-center space-x-3 text-xs text-[var(--color-muted)] font-semibold">
            <span className="flex items-center">
              <Database className="h-3.5 w-3.5 mr-1" />
              {die.set_name || 'No Set'}
            </span>
            {die.machine_name && (
              <>
                <span>·</span>
                <span className="flex items-center">
                  <Cpu className="h-3.5 w-3.5 mr-1" />
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
      onClick={onClick}
      className={`bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-2xl p-5 flex flex-col justify-between h-48 transition-colors duration-150 cursor-pointer focus-ring select-none border-l-4 ${
        isRound ? 'border-l-blue-500' : 'border-l-purple-500'
      }`}
    >
      <div className="space-y-3">
        {/* Monospace Primary Line */}
        <div className="font-mono text-lg font-black text-[var(--color-text)] tracking-tight leading-tight">
          {sizeText}
        </div>

        {/* Secondary Info Line */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xxs text-[var(--color-muted)] font-bold tracking-wide uppercase">
          <span className="flex items-center font-mono">
            <Hash className="h-3 w-3 mr-0.5 shrink-0" />
            {die.die_id}
          </span>
          <span>·</span>
          <span className="flex items-center">
            <Box className="h-3 w-3 mr-0.5 shrink-0" />
            {die.casing || 'N/A'}
          </span>
          <span>·</span>
          <span className="flex items-center">
            <MapPin className="h-3 w-3 mr-0.5 shrink-0" />
            <span className="truncate max-w-[100px]">{locationText}</span>
          </span>
        </div>
      </div>

      {/* Footer Row */}
      <div className="border-t border-[var(--color-border)]/65 pt-3.5 flex items-center justify-between gap-2 mt-auto">
        <div className="flex flex-col text-[10px] text-[var(--color-muted)] font-bold uppercase tracking-wider min-w-0">
          <span className="truncate flex items-center">
            <Database className="h-3 w-3 mr-1 text-slate-500 shrink-0" />
            {die.set_name || 'No Set'}
          </span>
          {die.machine_name && (
            <span className="truncate flex items-center mt-0.5">
              <Cpu className="h-3 w-3 mr-1 text-slate-500 shrink-0" />
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
}
