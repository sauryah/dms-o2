import React, { useState } from 'react'

interface DieData {
  die_type: string
  die_id: string
  punched_size?: string
  current_size?: string
  punched_width?: string
  current_width?: string
  punched_thickness?: string
  current_thickness?: string
  radius?: string
  casing?: string
  status: string
}

interface DieBlueprintProps {
  die: DieData | null
  activeHighlight?: string | null
  onHoverDim?: (dim: string | null) => void
}

export function DieBlueprint({ die, activeHighlight, onHoverDim }: DieBlueprintProps) {
  if (!die) return null

  const isRound = die.die_type === 'ROUND'
  const [activeTooltip, setActiveTooltip] = useState<{
    title: string
    content: string
    details: string
    isPinned?: boolean
  } | null>(null)

  const handleDimClick = (title: string, content: string, details: string) => {
    setActiveTooltip(prev => {
      if (prev && prev.title === title && prev.isPinned) {
        return null
      }
      return { title, content, details, isPinned: true }
    })
  }

  const handleDimMouseEnter = (title: string, content: string, details: string) => {
    setActiveTooltip(prev => {
      if (prev?.isPinned) return prev
      return { title, content, details, isPinned: false }
    })
  }

  const handleDimMouseLeave = () => {
    setActiveTooltip(prev => {
      if (prev?.isPinned) return prev
      return null
    })
  }

  const handleDimKeyDown = (e: React.KeyboardEvent, title: string, content: string, details: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleDimClick(title, content, details)
    }
  }

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
            {die.punched_size && (
              <circle 
                cx="100" 
                cy="100" 
                r="75" 
                fill="none" 
                className={`blueprint-outline-secondary transition-all duration-300 ${
                  activeHighlight === 'punched_size' ? 'stroke-indigo-400 stroke-[2.5px] drop-shadow-[0_0_6px_rgba(99,102,241,0.8)]' : ''
                }`} 
              />
            )}
            <circle 
              cx="100" 
              cy="100" 
              r={75 * (parseFloat(die.current_size || '0') / parseFloat(die.punched_size || die.current_size || '1'))} 
              fill="rgba(59, 130, 246, 0.06)" 
              className="blueprint-outline animate-dash" 
            />
            <circle cx="100" cy="100" r="3" fill="#3b82f6" />
            <g
              className={`interactive-dim-group${activeHighlight === 'current_size' ? ' highlighted' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => handleDimClick(
                "Diameter / Current Size",
                "Specifies the active extrusion diameter of the round die (mm).",
                "Tolerance limit: ±0.05 mm. Standard operating limit is based on wear and expansion thresholds. Regular calibration is mandatory."
              )}
              onMouseEnter={() => {
                handleDimMouseEnter(
                  "Diameter / Current Size",
                  "Specifies the active extrusion diameter of the round die (mm).",
                  "Tolerance limit: ±0.05 mm. Standard operating limit is based on wear and expansion thresholds. Regular calibration is mandatory."
                )
                onHoverDim?.('current_size')
              }}
              onMouseLeave={() => {
                handleDimMouseLeave()
                onHoverDim?.(null)
              }}
              onKeyDown={(e) => handleDimKeyDown(e,
                "Diameter / Current Size",
                "Specifies the active extrusion diameter of the round die (mm).",
                "Tolerance limit: ±0.05 mm. Standard operating limit is based on wear and expansion thresholds. Regular calibration is mandatory."
              )}
              aria-label={`Current diameter: ${die.current_size || '—'}mm`}
            >
              <line x1="25" y1="100" x2="175" y2="100" className="blueprint-dim-line" strokeDasharray="3 3" />
              <path d="M 25 100 L 32 97 L 32 103 Z" fill="#10b981" />
              <path d="M 175 100 L 168 97 L 168 103 Z" fill="#10b981" />
              <rect x="72" y="88" width="56" height="15" rx="3" fill="#030712" />
              <text x="100" y="99" textAnchor="middle" className="blueprint-dim-text">
                Ø {die.current_size}
              </text>
            </g>
            {die.punched_size && die.punched_size !== die.current_size && (
              <g
                className={`interactive-dim-group${activeHighlight === 'punched_size' ? ' highlighted' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => handleDimClick(
                  "Punched Size",
                  "The physical dimension marked (punched) on the die currently (mm).",
                  "Comparing punched vs current size calculates the cumulative wear rate to forecast tool retirement/scrapping."
                )}
                onMouseEnter={() => {
                  handleDimMouseEnter(
                    "Punched Size",
                    "The physical dimension marked (punched) on the die currently (mm).",
                    "Comparing punched vs current size calculates the cumulative wear rate to forecast tool retirement/scrapping."
                  )
                  onHoverDim?.('punched_size')
                }}
                onMouseLeave={() => {
                  handleDimMouseLeave()
                  onHoverDim?.(null)
                }}
                onKeyDown={(e) => handleDimKeyDown(e,
                  "Punched Size",
                  "The physical dimension marked (punched) on the die currently (mm).",
                  "Comparing punched vs current size calculates the cumulative wear rate to forecast tool retirement/scrapping."
                )}
                aria-label={`Punched diameter: ${die.punched_size || '—'}mm`}
              >
                <line x1="100" y1="25" x2="145" y2="25" className="blueprint-dim-line" />
                <circle cx="100" cy="25" r="2" fill="#10b981" />
                <text x="150" y="28" className="blueprint-dim-text" textAnchor="start">
                  Punched: Ø {die.punched_size}
                </text>
              </g>
            )}
          </svg>
        ) : (
          (() => {
            const width = parseFloat(die.current_width || '0')
            const thickness = parseFloat(die.current_thickness || '0')
            const origWidth = parseFloat(die.punched_width || die.current_width || '1')
            const origThick = parseFloat(die.punched_thickness || die.current_thickness || '1')
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
                {die.punched_width && (
                  <rect 
                    x={ox} 
                    y={oy} 
                    width={ow} 
                    height={ot} 
                    rx={r} 
                    ry={r} 
                    fill="none" 
                    className={`blueprint-outline-secondary transition-all duration-300 ${
                      activeHighlight === 'punched_width_thickness' ? 'stroke-indigo-400 stroke-[2.5px] drop-shadow-[0_0_6px_rgba(99,102,241,0.8)]' : ''
                    }`} 
                  />
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
                <g
                  className={`interactive-dim-group${activeHighlight === 'current_width' ? ' highlighted' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleDimClick(
                    "Width",
                    "Active width dimension of the flat die extrusion path (mm).",
                    "Tolerance limit: ±0.1 mm. Critical for maintaining uniform edge thickness and avoiding flow bottlenecks during flat extrusion runs."
                  )}
                  onMouseEnter={() => {
                    handleDimMouseEnter(
                      "Width",
                      "Active width dimension of the flat die extrusion path (mm).",
                      "Tolerance limit: ±0.1 mm. Critical for maintaining uniform edge thickness and avoiding flow bottlenecks during flat extrusion runs."
                    )
                    onHoverDim?.('current_width')
                  }}
                  onMouseLeave={() => {
                    handleDimMouseLeave()
                    onHoverDim?.(null)
                  }}
                  onKeyDown={(e) => handleDimKeyDown(e,
                    "Width",
                    "Active width dimension of the flat die extrusion path (mm).",
                    "Tolerance limit: ±0.1 mm. Critical for maintaining uniform edge thickness and avoiding flow bottlenecks during flat extrusion runs."
                  )}
                  aria-label={`Current width: ${die.current_width || '—'}mm`}
                >
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
                <g
                  className={`interactive-dim-group${activeHighlight === 'current_thickness' ? ' highlighted' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleDimClick(
                    "Thickness",
                    "Thickness dimension of the flat extrusion channel (mm).",
                    "Wear threshold: Max +0.08 mm deviation. Exceeding this causes thickness defects; die must be sent for polishing or scrapped."
                  )}
                  onMouseEnter={() => {
                    handleDimMouseEnter(
                      "Thickness",
                      "Thickness dimension of the flat extrusion channel (mm).",
                      "Wear threshold: Max +0.08 mm deviation. Exceeding this causes thickness defects; die must be sent for polishing or scrapped."
                    )
                    onHoverDim?.('current_thickness')
                  }}
                  onMouseLeave={() => {
                    handleDimMouseLeave()
                    onHoverDim?.(null)
                  }}
                  onKeyDown={(e) => handleDimKeyDown(e,
                    "Thickness",
                    "Thickness dimension of the flat extrusion channel (mm).",
                    "Wear threshold: Max +0.08 mm deviation. Exceeding this causes thickness defects; die must be sent for polishing or scrapped."
                  )}
                  aria-label={`Current thickness: ${die.current_thickness || '—'}mm`}
                >
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
                  <g
                    className={`interactive-dim-group${activeHighlight === 'radius' ? ' highlighted' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleDimClick(
                      "Corner Radius",
                      "Fillet radius of the flat die corners (mm).",
                      "Reduces stress concentration on corners and helps achieve smooth material distribution during flat extrusion."
                    )}
                    onMouseEnter={() => {
                      handleDimMouseEnter(
                        "Corner Radius",
                        "Fillet radius of the flat die corners (mm).",
                        "Reduces stress concentration on corners and helps achieve smooth material distribution during flat extrusion."
                      )
                      onHoverDim?.('radius')
                    }}
                    onMouseLeave={() => {
                      handleDimMouseLeave()
                      onHoverDim?.(null)
                    }}
                    onKeyDown={(e) => handleDimKeyDown(e,
                      "Corner Radius",
                      "Fillet radius of the flat die corners (mm).",
                      "Reduces stress concentration on corners and helps achieve smooth material distribution during flat extrusion."
                    )}
                    aria-label={`Corner radius: ${die.radius || '—'}mm`}
                  >
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
      
      <div className="flex justify-between items-center text-slate-500 text-[9px] font-mono mt-3 pt-2 border-t border-slate-800/80 w-full">
        <span 
          className={`hover:text-blue-400 focus-visible:text-blue-400 cursor-pointer outline-none transition-all duration-300 ${
            activeHighlight === 'casing' ? 'text-blue-400 font-bold scale-105' : ''
          }`}
          role="button"
          tabIndex={0}
          onClick={() => handleDimClick(
            "Casing Group",
            "The outer supporting ring housing the die insert.",
            "Maintenance rule: Inspect casing every 100 cycles for fatigue cracks. Casing dimensions must strictly match set adapter specs."
          )}
          onMouseEnter={() => {
            handleDimMouseEnter(
              "Casing Group",
              "The outer supporting ring housing the die insert.",
              "Maintenance rule: Inspect casing every 100 cycles for fatigue cracks. Casing dimensions must strictly match set adapter specs."
            )
            onHoverDim?.('casing')
          }}
          onMouseLeave={() => {
            handleDimMouseLeave()
            onHoverDim?.(null)
          }}
          onKeyDown={(e) => handleDimKeyDown(e,
            "Casing Group",
            "The outer supporting ring housing the die insert.",
            "Maintenance rule: Inspect casing every 100 cycles for fatigue cracks. Casing dimensions must strictly match set adapter specs."
          )}
          aria-label="Casing information"
        >
          Casing: {die.casing || '—'}
        </span>
        <span 
          className={`hover:text-blue-400 focus-visible:text-blue-400 cursor-pointer outline-none transition-all duration-300 ${
            activeHighlight === 'status' ? 'text-blue-400 font-bold scale-105' : ''
          }`}
          role="button"
          tabIndex={0}
          onClick={() => handleDimClick(
            "Operational Status",
            `Current Operational Status: ${die.status}.`,
            "AVAILABLE means ready for install. RUNNING means active on a machine. CLEANING, POLISHING, and MAINTENANCE prevent defects. DAMAGED or SCRAPPED represent offline states."
          )}
          onMouseEnter={() => {
            handleDimMouseEnter(
              "Operational Status",
              `Current Operational Status: ${die.status}.`,
              "AVAILABLE means ready for install. RUNNING means active on a machine. CLEANING, POLISHING, and MAINTENANCE prevent defects. DAMAGED or SCRAPPED represent offline states."
            )
            onHoverDim?.('status')
          }}
          onMouseLeave={() => {
            handleDimMouseLeave()
            onHoverDim?.(null)
          }}
          onKeyDown={(e) => handleDimKeyDown(e,
            "Operational Status",
            `Current Operational Status: ${die.status}.`,
            "AVAILABLE means ready for install. RUNNING means active on a machine. CLEANING, POLISHING, and MAINTENANCE prevent defects. DAMAGED or SCRAPPED represent offline states."
          )}
          aria-label="Status information"
        >
          Status: {die.status}
        </span>
        <span>Units: mm</span>
      </div>

      {activeTooltip && (
        <div className="absolute inset-x-3 bottom-3 bg-slate-950/95 backdrop-blur-md border border-blue-500/40 rounded-lg p-3 text-xs shadow-2xl z-10 animate-fadeIn">
          <div className="flex justify-between items-start mb-1">
            <h4 className="text-blue-400 font-bold tracking-wide text-[11px]">{activeTooltip.title}</h4>
            <div className="flex items-center gap-1.5">
              {activeTooltip.isPinned ? (
                <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 py-0.2 rounded font-semibold font-mono">Pinned</span>
              ) : (
                <span className="text-[8px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded font-semibold font-mono">Hovering</span>
              )}
              <button 
                onClick={() => setActiveTooltip(null)} 
                className="text-slate-400 hover:text-white transition-colors font-bold text-sm leading-none"
                aria-label="Close tooltip"
              >
                &times;
              </button>
            </div>
          </div>
          <p className="text-slate-200 font-medium mb-1 leading-relaxed text-[10.5px]">{activeTooltip.content}</p>
          {activeTooltip.isPinned && (
            <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 mt-1.5 leading-normal animate-slideDown">
              <strong className="text-slate-300">Engineering Note:</strong> {activeTooltip.details}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
