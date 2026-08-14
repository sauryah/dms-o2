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
    <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 font-mono">
      <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-[#2a2a2a]">
        <Activity className="h-4 w-4 text-blue-500" />
        <h3 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">05 INDUSTRIAL AUDIT LOG</h3>
      </div>

      {history && history.length > 0 ? (
        <div className="relative pl-6 border-l border-[#2a2a2a] space-y-4 ml-2">
          {history.map((hist, index) => {
            // Determine action details based on field name
            let IconComponent = HelpCircle
            let iconColor = 'text-[#6b7280]'
            let bgLightColor = 'bg-[#141414]'
            let borderColor = 'border-[#2a2a2a]'
            let actionTitle = `UPDATED ${hist.field_name.toUpperCase()}`
            
            if (hist.field_name === 'status') {
              actionTitle = 'STATUS TRANSITIONED'
              IconComponent = RefreshCw
              iconColor = 'text-emerald-400'
              bgLightColor = 'bg-[#141414]'
              borderColor = 'border-emerald-500/30'
            } else if (hist.field_name === 'location') {
              actionTitle = 'RELOCATED ASSET'
              IconComponent = MapPin
              iconColor = 'text-blue-400'
              bgLightColor = 'bg-[#141414]'
              borderColor = 'border-blue-500/30'
            } else if (hist.field_name === 'current_set_id') {
              actionTitle = 'REALLOCATED SET'
              IconComponent = Layers
              iconColor = 'text-purple-400'
              bgLightColor = 'bg-[#141414]'
              borderColor = 'border-purple-500/30'
            } else if (
              hist.field_name === 'current_size' || 
              hist.field_name === 'current_width' || 
              hist.field_name === 'current_thickness' ||
              hist.field_name === 'radius'
            ) {
              actionTitle = 'WEAR CALIBRATED'
              IconComponent = Activity
              iconColor = 'text-amber-400'
              bgLightColor = 'bg-[#141414]'
              borderColor = 'border-amber-500/30'
            } else if (hist.field_name === 'die_id') {
              actionTitle = 'DIE ID ALTERED'
              IconComponent = Key
              iconColor = 'text-red-400'
              bgLightColor = 'bg-[#141414]'
              borderColor = 'border-red-500/30'
            } else if (hist.field_name === 'casing') {
              actionTitle = 'CASING MODIFIED'
              IconComponent = Settings
              iconColor = 'text-blue-400'
              bgLightColor = 'bg-[#141414]'
              borderColor = 'border-blue-500/30'
            } else if (
              hist.field_name === 'punched_size' ||
              hist.field_name === 'punched_width' ||
              hist.field_name === 'punched_thickness'
            ) {
              actionTitle = 'BASE DIMENSION MODIFIED'
              IconComponent = Settings
              iconColor = 'text-purple-400'
              bgLightColor = 'bg-[#141414]'
              borderColor = 'border-purple-500/30'
            } else if (hist.field_name === 'remarks') {
              actionTitle = 'REMARKS LOGGED'
              IconComponent = FileText
              iconColor = 'text-[#6b7280]'
              bgLightColor = 'bg-[#141414]'
              borderColor = 'border-[#2a2a2a]'
            }

            return (
              <div key={index} className="relative group transition-colors">
                {/* Timeline Icon Badge */}
                <div className={`absolute -left-[33px] top-1.5 w-5 h-5 rounded-none flex items-center justify-center bg-[#0a0a0a] border ${borderColor} z-10`}>
                  <IconComponent className={`h-2.5 w-2.5 ${iconColor}`} />
                </div>
                
                {/* Timeline card */}
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm p-3 font-mono">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[#1a1a1a]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#e4e4e4] uppercase tracking-wider">{actionTitle}</span>
                      <span className="px-1.5 py-0.2 text-[9px] uppercase text-[#6b7280] bg-[#141414] border border-[#2a2a2a] rounded-sm">
                        {getFieldDisplayName(hist.field_name)}
                      </span>
                    </div>
                    
                    {/* Metadata */}
                    <div className="flex items-center gap-2 text-[9px] text-[#6b7280] uppercase tracking-wider tabular-nums">
                      <span>{new Date(hist.timestamp).toLocaleString()}</span>
                      <span>•</span>
                      <span>IP: {hist.ip_address || '127.0.0.1'}</span>
                    </div>
                  </div>
                  
                  {/* Side-by-side comparison panel */}
                  <div className="flex items-center gap-3 bg-[#141414] border border-[#2a2a2a] rounded-sm p-2">
                    <div className="flex flex-col min-w-[100px] max-w-[180px]">
                      <span className="text-[8px] text-[#6b7280] uppercase tracking-wider mb-0.5">PREVIOUS</span>
                      <span className="text-xs text-red-400 font-mono select-all truncate tabular-nums" title={hist.old_value || 'Empty'}>
                        {hist.old_value || <span className="text-[#404040]">EMPTY</span>}
                      </span>
                    </div>
                    
                    <ArrowRight className="h-3 w-3 text-[#404040] shrink-0" />
                    
                    <div className="flex flex-col min-w-[100px] max-w-[180px]">
                      <span className="text-[8px] text-[#6b7280] uppercase tracking-wider mb-0.5">UPDATED</span>
                      <span className="text-xs text-emerald-400 font-mono font-bold select-all truncate tabular-nums" title={hist.new_value || 'Empty'}>
                        {hist.new_value || <span className="text-[#404040]">EMPTY</span>}
                      </span>
                    </div>
                  </div>

                  {/* Operator signature footer */}
                  <div className="mt-2 pt-1.5 border-t border-[#1a1a1a] flex items-center justify-between text-[9px] text-[#6b7280] uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-none bg-[#6b7280]" />
                      <span>OPERATOR: <span className="text-[#e4e4e4]">{hist.changed_by_username || 'System Daemon'}</span></span>
                    </div>
                    {hist.note && (
                      <span className="text-[#6b7280]">NOTE: {hist.note}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8 bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm flex flex-col justify-center items-center font-mono">
          <History className="h-6 w-6 text-[#404040] mb-2" />
          <p className="text-[#6b7280] text-xs uppercase">No state modifications recorded for this die.</p>
        </div>
      )}
    </div>
  )
}
