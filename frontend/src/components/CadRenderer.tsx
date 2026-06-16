import React from 'react'

interface DieData {
  die_type: string
  die_id: string
  original_size?: string
  current_size?: string
  original_width?: string
  current_width?: string
  original_thickness?: string
  current_thickness?: string
  radius?: string
  casing?: string
  status: string
}

interface DieBlueprintProps {
  die: DieData | null
}

export function DieBlueprint({ die }: DieBlueprintProps) {
  if (!die) return null

  const isRound = die.die_type === 'ROUND'

  return (
    <div className="relative glass-panel rounded-xl p-5 border border-slate-800/80 shadow-2xl blueprint-grid min-h-[280px] flex flex-col justify-between overflow-hidden">
      <div className="flex justify-between items-center mb-4 border-b border-slate-800/80 pb-3">
        <div>
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider font-heading block">Dimensions Blueprint</span>
          <span className="text-slate-500 text-[10px] block mt-0.5">Scale Vector CAD Simulation (mm)</span>
        </div>
        <span className="px-2.5 py-0.5 text-xxs font-mono font-bold bg-blue-950 text-blue-400 border border-blue-800/50 rounded-full">
          {die.die_type}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center p-3">
        {isRound ? (
          <svg className="w-full max-w-[180px] h-[180px]" viewBox="0 0 200 200">
            <line x1="100" y1="10" x2="100" y2="190" className="blueprint-axis" />
            <line x1="10" y1="100" x2="190" y2="100" className="blueprint-axis" />
            {die.original_size && (
              <circle cx="100" cy="100" r="75" fill="none" className="blueprint-outline-secondary" />
            )}
            <circle 
              cx="100" 
              cy="100" 
              r={75 * (parseFloat(die.current_size || '0') / parseFloat(die.original_size || die.current_size || '1'))} 
              fill="rgba(59, 130, 246, 0.06)" 
              className="blueprint-outline animate-dash" 
            />
            <circle cx="100" cy="100" r="3" fill="#3b82f6" />
            <g>
              <line x1="25" y1="100" x2="175" y2="100" className="blueprint-dim-line" strokeDasharray="3 3" />
              <path d="M 25 100 L 32 97 L 32 103 Z" fill="#10b981" />
              <path d="M 175 100 L 168 97 L 168 103 Z" fill="#10b981" />
              <rect x="72" y="88" width="56" height="15" rx="3" fill="#030712" />
              <text x="100" y="99" textAnchor="middle" className="blueprint-dim-text">
                Ø {die.current_size}
              </text>
            </g>
            {die.original_size && die.original_size !== die.current_size && (
              <g>
                <line x1="100" y1="25" x2="145" y2="25" className="blueprint-dim-line" />
                <circle cx="100" cy="25" r="2" fill="#10b981" />
                <text x="150" y="28" className="blueprint-dim-text" textAnchor="start">
                  Orig: Ø {die.original_size}
                </text>
              </g>
            )}
          </svg>
        ) : (
          (() => {
            const width = parseFloat(die.current_width || '0')
            const thickness = parseFloat(die.current_thickness || '0')
            const origWidth = parseFloat(die.original_width || die.current_width || '1')
            const origThick = parseFloat(die.original_thickness || die.current_thickness || '1')
            const radius = parseFloat(die.radius || '0')

            const maxVal = Math.max(origWidth, origThick)
            const scale = 130 / maxVal
            const w = width * scale
            const t = thickness * scale
            const ow = origWidth * scale
            const ot = origThick * scale
            const r = Math.min(radius * scale, Math.min(w, t) / 2)

            const x = 100 - w / 2
            const y = 100 - t / 2
            const ox = 100 - ow / 2
            const oy = 100 - ot / 2

            return (
              <svg className="w-full max-w-[180px] h-[180px]" viewBox="0 0 200 200">
                <line x1="100" y1="10" x2="100" y2="190" className="blueprint-axis" />
                <line x1="10" y1="100" x2="190" y2="100" className="blueprint-axis" />
                {die.original_width && (
                  <rect x={ox} y={oy} width={ow} height={ot} rx={r} ry={r} fill="none" className="blueprint-outline-secondary" />
                )}
                <rect 
                  x={x} 
                  y={y} 
                  width={w} 
                  height={t} 
                  rx={r} 
                  ry={r} 
                  fill="rgba(59, 130, 246, 0.06)" 
                  className="blueprint-outline animate-dash" 
                />
                <circle cx="100" cy="100" r="3" fill="#3b82f6" />
                <g>
                  <line x1={x} y1={y + t + 15} x2={x + w} y2={y + t + 15} className="blueprint-dim-line" />
                  <line x1={x} y1={y + t + 5} x2={x} y2={y + t + 20} className="blueprint-dim-line" strokeWidth="0.5" />
                  <line x1={x + w} y1={y + t + 5} x2={x + w} y2={y + t + 20} className="blueprint-dim-line" strokeWidth="0.5" />
                  <path d={`M ${x} ${y + t + 15} L ${x + 6} ${y + t + 12} L ${x + 6} ${y + t + 18} Z`} fill="#10b981" />
                  <path d={`M ${x + w} ${y + t + 15} L ${x + w - 6} ${y + t + 12} L ${x + w - 6} ${y + t + 18} Z`} fill="#10b981" />
                  <rect x="85" y={y + t + 7} width="30" height="14" rx="2" fill="#030712" />
                  <text x="100" y={y + t + 17} textAnchor="middle" className="blueprint-dim-text">
                    W: {die.current_width}
                  </text>
                </g>
                <g>
                  <line x1={x - 15} y1={y} x2={x - 15} y2={y + t} className="blueprint-dim-line" />
                  <line x1={x - 20} y1={y} x2={x - 5} y2={y} className="blueprint-dim-line" strokeWidth="0.5" />
                  <line x1={x - 20} y1={y + t} x2={x - 5} y2={y + t} className="blueprint-dim-line" strokeWidth="0.5" />
                  <path d={`M ${x - 15} ${y} L ${x - 18} ${y + 6} L ${x - 12} ${y + 6} Z`} fill="#10b981" />
                  <path d={`M ${x - 15} ${y + t} L ${x - 18} ${y + t - 6} L ${x - 12} ${y + t - 6} Z`} fill="#10b981" />
                  <text x={x - 18} y={y + t / 2 + 4} textAnchor="end" className="blueprint-dim-text">
                    T: {die.current_thickness}
                  </text>
                </g>
                {radius > 0 && (
                  <g>
                    <path d={`M ${x + w - r + r * Math.cos(Math.PI/4)} ${y + r - r * Math.sin(Math.PI/4)} L ${x + w + 12} ${y - 12}`} className="blueprint-dim-line" fill="none" strokeWidth="0.75" />
                    <circle cx={x + w - r + r * Math.cos(Math.PI/4)} cy={y + r - r * Math.sin(Math.PI/4)} r="2" fill="#10b981" />
                    <text x={x + w + 16} y={y - 10} className="blueprint-dim-text" textAnchor="start">
                      R: {die.radius}
                    </text>
                  </g>
                )}
              </svg>
            )
          })()
        )}
      </div>
      
      <div className="flex justify-between items-center text-slate-500 text-[9px] font-mono mt-3 pt-2 border-t border-slate-800/80">
        <span>Casing: {die.casing || '—'}</span>
        <span>Status: {die.status}</span>
      </div>
    </div>
  )
}
