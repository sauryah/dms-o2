import React from 'react'
import { Die, getStatusColorClass } from '../../../types'

interface FlatDieCardProps {
  die: Die;
  onClick?: () => void;
}

export function FlatDieCard({ die, onClick }: FlatDieCardProps) {
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
      aria-label={`Flat Die ${die.die_id}, Status: ${die.status}, Casing: ${die.casing || 'None'}, Location: ${die.location || 'None'}`}
      className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 hover:border-blue-500/40 hover:bg-slate-900/90 active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-lg rounded-xl p-6 flex flex-col justify-between group h-full focus-ring"
    >
      <div>
        <div className="flex justify-between items-start mb-4 gap-4">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest block mb-1">Flat Die</span>
            <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors truncate font-mono" title={die.current_width && die.current_thickness ? `${die.current_width} × ${die.current_thickness} mm${die.radius ? ` (R: ${die.radius} mm)` : ''}` : 'N/A'}>
              {die.current_width && die.current_thickness ? `${die.current_width} × ${die.current_thickness} mm${die.radius ? ` (R: ${die.radius} mm)` : ''}` : 'N/A'}
            </h3>
          </div>
          <div className="flex flex-col items-end gap-2.5 shrink-0">
            <span className={`px-2.5 py-0.5 text-[10px] font-mono font-semibold rounded-md border ${getStatusColorClass(die.status)}`}>
              {die.status}
            </span>
            <svg className="w-10 h-10 text-indigo-500/20 opacity-70 group-hover:text-indigo-500/35 transition-colors" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="20" y="30" width="60" height="40" strokeDasharray="3 3" />
              <rect x="28" y="38" width="44" height="24" strokeWidth="2.5" className="text-indigo-500/40 group-hover:text-indigo-500/65 transition-colors" />
              <line x1="50" y1="10" x2="50" y2="90" strokeDasharray="2 2" />
              <line x1="10" y1="50" x2="90" y2="50" strokeDasharray="2 2" />
            </svg>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs border-t border-slate-800/80 pt-4 mt-2">
        <div>
          <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5 font-semibold">Die ID</span>
          <span className="font-semibold text-slate-200 font-mono truncate block" title={die.die_id}>{die.die_id}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5 font-semibold">Casing</span>
          <span className="font-semibold text-slate-200 font-mono truncate block" title={die.casing}>{die.casing || '—'}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5 font-semibold">Location</span>
          <span className="font-semibold text-slate-200 truncate block" title={die.location || undefined}>{die.location || '—'}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5 font-semibold">Set / Machine</span>
          <span className="font-semibold text-slate-200 truncate block" title={die.set_name ? `${die.set_name} (${die.machine_name})` : undefined}>
            {die.set_name ? `${die.set_name} (${die.machine_name})` : '—'}
          </span>
        </div>
      </div>

      {die.predicted_remaining_days !== undefined && die.predicted_remaining_days !== null && (
        <div className="flex justify-between items-center bg-slate-950/40 border border-slate-800/50 rounded-lg px-3 py-2 mt-4">
          <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Est. Lifetime</span>
          <span className={`font-mono text-xs font-bold ${
            die.predicted_remaining_days < 7 
              ? 'text-rose-500' 
              : die.predicted_remaining_days < 30 
              ? 'text-amber-500' 
              : 'text-emerald-500'
          }`}>
            {die.predicted_remaining_days} days
          </span>
        </div>
      )}
    </div>
  )
}

