import React from 'react'
import { 
  Activity, 
  MapPin, 
  Layers, 
  Key, 
  FileText, 
  RefreshCw, 
  Settings, 
  ArrowRight,
  History,
  HelpCircle
} from 'lucide-react'

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

const getFieldDisplayName = (fieldName: string) => {
  const mapping: { [key: string]: string } = {
    status: 'Operational Status',
    location: 'Physical Location',
    current_set_id: 'Assigned Set',
    remarks: 'Remarks / Comments',
    die_id: 'Die ID Reference',
    casing: 'Casing Specification',
    current_size: 'Current Outer Diameter',
    punched_size: 'Original Punched Size',
    current_width: 'Current Ribbon Width',
    punched_width: 'Original Punched Width',
    current_thickness: 'Current Ribbon Thickness',
    punched_thickness: 'Original Punched Thickness',
    radius: 'Corner Radius'
  }
  return mapping[fieldName] || fieldName.replace(/_/g, ' ')
}

export function Timeline({ history }: TimelineProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8">
      <div className="flex items-center space-x-2.5 mb-8">
        <Activity className="h-5 w-5 text-blue-500 dot-glow" />
        <h3 className="text-lg font-black text-white uppercase tracking-wider">Industrial Audit Log</h3>
      </div>

      {history && history.length > 0 ? (
        <div className="relative pl-8 border-l border-slate-800/80 space-y-8 ml-4">
          {history.map((hist, index) => {
            // Determine action details based on field name
            let IconComponent = HelpCircle
            let iconColor = 'text-slate-400'
            let bgLightColor = 'bg-slate-500/10'
            let borderColor = 'border-slate-800/40'
            let actionTitle = `Updated ${hist.field_name}`
            
            if (hist.field_name === 'status') {
              actionTitle = 'Status Transitioned'
              IconComponent = RefreshCw
              iconColor = 'text-emerald-400'
              bgLightColor = 'bg-emerald-500/10'
              borderColor = 'border-emerald-500/20'
            } else if (hist.field_name === 'location') {
              actionTitle = 'Relocated Asset'
              IconComponent = MapPin
              iconColor = 'text-blue-400'
              bgLightColor = 'bg-blue-500/10'
              borderColor = 'border-blue-500/20'
            } else if (hist.field_name === 'current_set_id') {
              actionTitle = 'Reallocated Set'
              IconComponent = Layers
              iconColor = 'text-indigo-400'
              bgLightColor = 'bg-indigo-500/10'
              borderColor = 'border-indigo-500/20'
            } else if (
              hist.field_name === 'current_size' || 
              hist.field_name === 'current_width' || 
              hist.field_name === 'current_thickness' ||
              hist.field_name === 'radius'
            ) {
              actionTitle = 'Wear Calibrated'
              IconComponent = Activity
              iconColor = 'text-amber-400'
              bgLightColor = 'bg-amber-500/10'
              borderColor = 'border-amber-500/20'
            } else if (hist.field_name === 'die_id') {
              actionTitle = 'Die ID Altered'
              IconComponent = Key
              iconColor = 'text-rose-400'
              bgLightColor = 'bg-rose-500/10'
              borderColor = 'border-rose-500/20'
            } else if (hist.field_name === 'casing') {
              actionTitle = 'Casing Modified'
              IconComponent = Settings
              iconColor = 'text-sky-400'
              bgLightColor = 'bg-sky-500/10'
              borderColor = 'border-sky-500/20'
            } else if (
              hist.field_name === 'punched_size' ||
              hist.field_name === 'punched_width' ||
              hist.field_name === 'punched_thickness'
            ) {
              actionTitle = 'Base Dimension Modified'
              IconComponent = Settings
              iconColor = 'text-purple-400'
              bgLightColor = 'bg-purple-500/10'
              borderColor = 'border-purple-500/20'
            } else if (hist.field_name === 'remarks') {
              actionTitle = 'Remarks Logged'
              IconComponent = FileText
              iconColor = 'text-slate-400'
              bgLightColor = 'bg-slate-500/10'
              borderColor = 'border-slate-500/20'
            }

            return (
              <div key={index} className="relative group transition-all duration-300">
                {/* Timeline Icon Badge */}
                <div className={`absolute -left-[44px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-slate-900 transition-transform duration-300 group-hover:scale-110 ${bgLightColor} border ${borderColor} z-10`}>
                  <IconComponent className={`h-3 w-3 ${iconColor}`} />
                </div>
                
                {/* Timeline card */}
                <div className="bg-slate-955/60 border border-slate-850 hover:border-slate-800 rounded-xl p-5 hover:scale-[1.001] transition-all duration-200 shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white tracking-tight">{actionTitle}</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800 rounded font-mono">
                        {getFieldDisplayName(hist.field_name)}
                      </span>
                    </div>
                    
                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xxs text-slate-500 font-semibold uppercase tracking-wider">
                      <span>{new Date(hist.timestamp).toLocaleString()}</span>
                      <span>•</span>
                      <span>IP: {hist.ip_address || '127.0.0.1'}</span>
                    </div>
                  </div>
                  
                  {/* Side-by-side comparison panel */}
                  <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-900/60 rounded-xl p-3.5 shadow-inner">
                    <div className="flex flex-col min-w-[120px] max-w-[200px]">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Previous</span>
                      <span className="text-xs text-rose-400 font-mono font-bold select-all truncate" title={hist.old_value || 'Empty'}>
                        {hist.old_value || <span className="text-slate-650 italic font-sans font-normal">empty</span>}
                      </span>
                    </div>
                    
                    <ArrowRight className="h-4 w-4 text-slate-700 shrink-0" />
                    
                    <div className="flex flex-col min-w-[120px] max-w-[200px]">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Updated</span>
                      <span className="text-xs text-emerald-400 font-mono font-bold select-all truncate" title={hist.new_value || 'Empty'}>
                        {hist.new_value || <span className="text-slate-650 italic font-sans font-normal">empty</span>}
                      </span>
                    </div>
                  </div>

                  {/* Operator signature footer */}
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
        <div className="text-center py-12 bg-slate-955/40 border border-slate-850 rounded-xl flex flex-col justify-center items-center">
          <History className="h-8 w-8 text-slate-700 mb-2 animate-pulse" />
          <p className="text-slate-500 text-sm">No state modifications recorded for this die.</p>
        </div>
      )}
    </div>
  )
}
