import React from 'react'
import { Die } from './types'

interface RoundDieCardProps {
  die: Die;
  onClick?: () => void;
}

export function RoundDieCard({ die, onClick }: RoundDieCardProps) {
  const statusColors = {
    AVAILABLE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    RUNNING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    CLEANING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    POLISHING: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    DAMAGED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    SCRAPPED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    MISSING: 'bg-red-500/10 text-red-400 border-red-500/20',
  }

  return (
    <div 
      onClick={onClick}
      className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-xl p-6 hover:border-blue-500/50 hover:bg-slate-800/85 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-blue-500/5 group"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Round Die</span>
          <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors mt-0.5">{die.die_id}</h3>
        </div>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${statusColors[die.status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
          {die.status}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm border-t border-slate-700/50 pt-4">
        <div>
          <span className="text-slate-500 block text-xs">Size</span>
          <span className="font-semibold text-slate-200">{die.current_size || 'N/A'} mm</span>
        </div>
        <div>
          <span className="text-slate-500 block text-xs">Casing</span>
          <span className="font-semibold text-slate-200">{die.casing}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-xs">Location</span>
          <span className="font-semibold text-slate-200 truncate block" title={die.location}>{die.location || '—'}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-xs">Set / Machine</span>
          <span className="font-semibold text-slate-200 truncate block" title={`${die.set_name} / ${die.machine_name}`}>
            {die.set_name ? `${die.set_name} (${die.machine_name})` : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}
