import React from 'react'
import { Die, getStatusColorClass } from '../../../types'

interface RoundDieCardProps {
  die: Die;
  onClick?: () => void;
}

export function RoundDieCard({ die, onClick }: RoundDieCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <div 
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Round Die ${die.die_id}, Status: ${die.status}, Casing: ${die.casing || 'None'}, Location: ${die.rack_name && die.shelf ? `${die.rack_name} - Shelf ${die.shelf}` : 'None'}`}
      className="bg-[#0f0f0f] border border-[#1a1a1a] hover:border-[#2a2a2a] border-l-2 border-l-blue-500 hover:bg-[#141414] transition-colors cursor-pointer rounded-sm p-4 flex flex-col justify-between group h-full focus-ring font-mono"
    >
      <div>
        <div className="flex justify-between items-start mb-3 gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest block mb-0.5">ROUND DIE</span>
            <h3 className="text-sm font-bold text-[#e4e4e4] group-hover:text-blue-400 transition-colors truncate font-mono tabular-nums" title={`${die.current_size || 'N/A'} mm`}>
              {die.current_size || 'N/A'} mm
            </h3>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-sm border ${getStatusColorClass(die.status)}`}>
              {die.status}
            </span>
            <svg className="w-8 h-8 text-[#2a2a2a] opacity-80 group-hover:text-blue-500/40 transition-colors" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <circle cx="50" cy="50" r="32" strokeDasharray="3 3" />
              <circle cx="50" cy="50" r="22" strokeWidth="2" />
              <line x1="50" y1="10" x2="50" y2="90" strokeDasharray="2 2" />
              <line x1="10" y1="50" x2="90" y2="50" strokeDasharray="2 2" />
            </svg>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-xs border-t border-[#1a1a1a] pt-3 mt-1 font-mono">
        <div>
          <span className="text-[#6b7280] block text-[9px] uppercase tracking-wider mb-0.5">DIE ID</span>
          <span className="text-[#e4e4e4] font-mono truncate block" title={die.die_id}>{die.die_id}</span>
        </div>
        <div>
          <span className="text-[#6b7280] block text-[9px] uppercase tracking-wider mb-0.5">CASING</span>
          <span className="text-[#e4e4e4] font-mono truncate block" title={die.casing}>{die.casing || '—'}</span>
        </div>
        <div>
          <span className="text-[#6b7280] block text-[9px] uppercase tracking-wider mb-0.5">LOCATION</span>
          <span className="text-[#e4e4e4] font-mono truncate block" title={die.rack_name && die.shelf ? `${die.rack_name} - Shelf ${die.shelf}` : undefined}>
            {die.rack_name && die.shelf ? `${die.rack_name} - Shelf ${die.shelf}` : '—'}
          </span>
        </div>
        <div>
          <span className="text-[#6b7280] block text-[9px] uppercase tracking-wider mb-0.5">SET / MACHINE</span>
          <span className="text-[#e4e4e4] font-mono truncate block" title={die.set_name ? `${die.set_name} (${die.machine_name})` : undefined}>
            {die.set_name ? `${die.set_name} (${die.machine_name})` : '—'}
          </span>
        </div>
      </div>

      {die.predicted_remaining_days !== undefined && die.predicted_remaining_days !== null && (
        <div className="flex justify-between items-center bg-[#141414] border border-[#2a2a2a] rounded-sm px-2.5 py-1.5 mt-3 font-mono">
          <span className="text-[#6b7280] text-[9px] uppercase tracking-wider">EST. LIFETIME</span>
          <span className={`font-mono text-xs tabular-nums ${
            die.predicted_remaining_days < 7 
              ? 'text-red-400' 
              : die.predicted_remaining_days < 30 
              ? 'text-amber-400' 
              : 'text-emerald-400'
          }`}>
            {die.predicted_remaining_days} DAYS
          </span>
        </div>
      )}
    </div>
  )
}
