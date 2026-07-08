import React from 'react'
import { Activity, History } from 'lucide-react'

interface DieHistoryItem {
  field_name: string
  old_value: string
  new_value: string
  timestamp: string
  ip_address?: string
  changed_by_username?: string
  note?: string
}

interface TimelineProps {
  history?: DieHistoryItem[]
}

export function Timeline({ history }: TimelineProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8">
      <div className="flex items-center space-x-2.5 mb-8">
        <Activity className="h-5 w-5 text-blue-500 dot-glow" />
        <h3 className="text-lg font-black text-white uppercase tracking-wider">Industrial Audit Log</h3>
      </div>

      {history && history.length > 0 ? (
        <div className="relative pl-6 border-l border-slate-800 space-y-8 ml-3">
          {history.map((hist, index) => {
            // Determine action details based on field name
            let dotColor = 'bg-slate-700'
            let actionTitle = `Updated ${hist.field_name}`
            
            if (hist.field_name === 'status') {
              actionTitle = 'Status Transitioned'
              dotColor = 'bg-emerald-500'
            } else if (hist.field_name === 'location') {
              actionTitle = 'Relocated'
              dotColor = 'bg-blue-500'
            } else if (hist.field_name === 'current_set_id') {
              actionTitle = 'Reallocated Set'
              dotColor = 'bg-indigo-500'
            } else if (
              hist.field_name === 'current_size' || 
              hist.field_name === 'current_width' || 
              hist.field_name === 'current_thickness' ||
              hist.field_name === 'radius'
            ) {
              actionTitle = 'Wear Calibrated'
              dotColor = 'bg-amber-500'
            } else if (hist.field_name === 'die_id') {
              actionTitle = 'Die ID Altered'
              dotColor = 'bg-rose-500'
            } else if (hist.field_name === 'casing') {
              actionTitle = 'Casing Modified'
              dotColor = 'bg-sky-500'
            } else if (
              hist.field_name === 'punched_size' ||
              hist.field_name === 'punched_width' ||
              hist.field_name === 'punched_thickness'
            ) {
              actionTitle = 'Base Dimension Modified'
              dotColor = 'bg-purple-500'
            }

            return (
              <div key={index} className="relative group transition-all duration-300">
                {/* Timeline dot */}
                <span className={`absolute -left-[31px] top-2 w-2.5 h-2.5 rounded-full ring-4 ring-slate-900 transition-transform duration-300 group-hover:scale-125 ${dotColor}`} />
                
                {/* Timeline card */}
                <div className="bg-slate-950/40 border border-slate-850 hover:border-slate-800 rounded-xl p-5 hover:scale-[1.002] transition-all duration-200 shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white tracking-tight">{actionTitle}</span>
                      <span className="px-2 py-0.5 text-xxs font-bold uppercase tracking-wider bg-slate-900 border border-slate-800 text-slate-400 rounded">
                        {hist.field_name}
                      </span>
                    </div>
                    
                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xxs text-slate-500 font-semibold uppercase tracking-wider">
                      <span>{new Date(hist.timestamp).toLocaleString()}</span>
                      <span>•</span>
                      <span>IP: {hist.ip_address || '127.0.0.1'}</span>
                    </div>
                  </div>
                  
                  {/* Value diff */}
                  <div className="flex items-center flex-wrap gap-2 text-xs">
                    <span className="text-slate-500">From</span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-rose-400 font-mono font-bold select-all truncate max-w-[200px]" title={hist.old_value || 'None'}>
                      {hist.old_value || 'None'}
                    </span>
                    <span className="text-slate-650 mx-1">→</span>
                    <span className="text-slate-500">To</span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-mono font-bold select-all truncate max-w-[200px]" title={hist.new_value || 'None'}>
                      {hist.new_value || 'None'}
                    </span>
                  </div>

                  {/* Operator footer */}
                  <div className="mt-4 pt-3 border-t border-slate-900/60 flex items-center justify-between text-xxs text-slate-500 font-semibold tracking-wide">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                      <span>Operator Signature: <span className="text-slate-400">{hist.changed_by_username || 'System Daemon'}</span></span>
                    </div>
                    {hist.note && (
                      <span className="italic text-slate-450">Note: {hist.note}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col justify-center items-center">
          <History className="h-8 w-8 text-slate-700 mb-2 animate-pulse" />
          <p className="text-slate-500 text-sm">No state modifications recorded for this die.</p>
        </div>
      )}
    </div>
  )
}
