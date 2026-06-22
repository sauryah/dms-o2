import React from 'react'
import { Die, DieStatus } from './types'

interface FlatDieCardProps {
  die: Die;
  onClick?: () => void;
}

export function FlatDieCard({ die, onClick }: FlatDieCardProps) {
  const statusColors: Record<DieStatus, string> = {
    AVAILABLE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    RUNNING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    CLEANING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    POLISHING: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    DAMAGED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    SCRAPPED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    MISSING: 'bg-red-500/10 text-red-400 border-red-500/20',
    MAINTENANCE: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    SCRAP: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  }

  return (
    <div 
      onClick={onClick}
      className="bg-slate-900/60 backdrop-blur-md border border-slate-850 hover:border-blue-500/30 hover:bg-slate-900/90 transition-all duration-300 cursor-pointer shadow-xl rounded-xl p-6 flex flex-col justify-between group h-full"
    >
      <div>
        <div className="flex justify-between items-start mb-4 gap-4">
          <div className="flex-1 min-w-0">
            <span className="text-xxs font-mono font-bold text-indigo-400/80 uppercase tracking-widest block mb-1">Flat Die</span>
            <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors truncate font-mono" title={die.current_width && die.current_thickness ? `${die.current_width} × ${die.current_thickness} mm` : 'N/A'}>
              {die.current_width && die.current_thickness ? `${die.current_width} × ${die.current_thickness} mm` : 'N/A'}
            </h3>
          </div>
          <div className="flex flex-col items-end gap-2.5 shrink-0">
            <span className={`px-2 py-0.5 text-xxs font-mono font-semibold rounded-md border ${statusColors[die.status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
              {die.status}
            </span>
            <svg className="w-10 h-10 text-indigo-500/20 opacity-70 group-hover:text-indigo-500/35 transition-colors" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
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
          <span className="text-slate-500 block text-xxs uppercase tracking-wider mb-0.5">Die ID</span>
          <span className="font-semibold text-slate-200 font-mono truncate block" title={die.die_id}>{die.die_id}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-xxs uppercase tracking-wider mb-0.5">Casing</span>
          <span className="font-semibold text-slate-200 font-mono truncate block" title={die.casing}>{die.casing || '—'}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-xxs uppercase tracking-wider mb-0.5">Location</span>
          <span className="font-semibold text-slate-200 truncate block" title={die.location || undefined}>{die.location || '—'}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-xxs uppercase tracking-wider mb-0.5">Set / Machine</span>
          <span className="font-semibold text-slate-200 truncate block" title={die.set_name ? `${die.set_name} (${die.machine_name})` : undefined}>
            {die.set_name ? `${die.set_name} (${die.machine_name})` : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}
