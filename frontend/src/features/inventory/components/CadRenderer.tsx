import React, { useState } from 'react'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'

interface DieData {
  die_type: string
  die_id: string
  punched_size?: string
  current_size?: string
  inlet_size?: string
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
  prediction?: any | null
}

export function DieBlueprint({ die, activeHighlight, onHoverDim, prediction }: DieBlueprintProps) {
  if (!die) return null

  const { role } = useAuth()
  const isRoot = role === 'ROOT'

  const isRound = die.die_type === 'ROUND'
  const [viewMode, setViewMode] = useState<'extrusion' | 'cross_section'>('extrusion')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [startPan, setStartPan] = useState({ x: 0, y: 0 })
  
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

  const handleZoomIn = () => setZoom(z => Math.min(3, z + 0.2))
  const handleZoomOut = () => setZoom(z => Math.max(0.5, z - 0.2))
  const handleZoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsPanning(true)
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning) return
    setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y })
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  // Tolerance warning checks from predictive model
  const sizeData = prediction?.dimensions?.size || prediction?.dimensions?.width || prediction?.dimensions?.thickness
  const isWarning = sizeData && sizeData.wear_percentage >= 70 && sizeData.wear_percentage < 100
  const isCritical = sizeData && sizeData.wear_percentage >= 100
  
  const dimColor = isCritical ? '#f43f5e' : isWarning ? '#fbbf24' : '#10b981'
  const dimColorHover = isCritical ? '#f43f5e' : isWarning ? '#fbbf24' : '#34d399'

  // Optical centers
  const cx = 92
  const cy = 104

  return (
    <div className="relative bg-[#060a13]/85 backdrop-blur-md rounded-xl p-6 border border-slate-900 shadow-2xl flex flex-col justify-between overflow-hidden">
      {/* Header Info */}
      <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-900/60">
        <div>
          <h2 className="text-[#F8FAFC] text-sm font-semibold tracking-tight block">Dimensions Blueprint</h2>
          <span className="text-slate-500 text-xs block mt-1 font-mono">Scale Vector CAD Simulation (mm)</span>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle Segmented Control (ROOT ONLY) */}
          {isRoot && (
            <div className="inline-flex bg-slate-950/80 p-0.5 rounded-lg border border-slate-900/80 text-xs font-semibold select-none">
              <button
                onClick={() => setViewMode('extrusion')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'extrusion'
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-900/30 font-bold'
                    : 'text-slate-500 hover:text-slate-350'
                }`}
              >
                Extrusion 2D
              </button>
              <button
                onClick={() => setViewMode('cross_section')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'cross_section'
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-900/30 font-bold'
                    : 'text-slate-500 hover:text-slate-350'
              }`}
              >
                Cross-Section
              </button>
            </div>
          )}

          <span className="px-2 py-0.5 text-xs font-mono font-medium bg-blue-950/20 text-blue-400/80 border border-blue-900/30 rounded-md select-none">
            {die.die_type}
          </span>
        </div>
      </div>

      {/* CAD Viewport container */}
      <div className="flex-1 flex items-center justify-center py-4 relative group">
        
        {/* Floating Zoom / Pan Controls Overlay (ROOT ONLY) */}
        {isRoot && (
          <div className="absolute right-2 bottom-2 flex flex-col gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity duration-300 z-10 select-none">
            <button
              onClick={handleZoomIn}
              className="p-1 rounded bg-[#090d16]/90 border border-slate-900 text-slate-400 hover:text-white hover:border-slate-800 transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 rounded bg-[#090d16]/90 border border-slate-900 text-slate-400 hover:text-white hover:border-slate-800 transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleZoomReset}
              className="p-1 rounded bg-[#090d16]/90 border border-slate-900 text-slate-400 hover:text-white hover:border-slate-800 transition cursor-pointer"
              title="Reset ViewPort"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {isRound ? (
          <svg 
            className="w-full max-w-[230px] h-[230px] transition-shadow duration-300" 
            viewBox="0 0 200 200"
            onMouseDown={isRoot ? handleMouseDown : undefined}
            onMouseMove={isRoot ? handleMouseMove : undefined}
            onMouseUp={isRoot ? handleMouseUp : undefined}
            onMouseLeave={isRoot ? handleMouseUp : undefined}
            style={{ cursor: isRoot ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
          >
            <style>{`
              .blueprint-axis { stroke: rgba(59, 130, 246, 0.08); stroke-width: 0.75; stroke-dasharray: 3 3; }
              .blueprint-outline { stroke: #3b82f6; stroke-width: 2; fill: none; }
              .blueprint-outline-secondary { stroke: rgba(59, 130, 246, 0.35); stroke-width: 1.25; stroke-dasharray: 4 2; fill: none; }
              .blueprint-dim-line { stroke: ${dimColor}; stroke-width: 0.85; fill: none; }
              .blueprint-dim-text { fill: ${dimColor}; font-family: monospace; font-size: 11px; font-weight: 600; }
              .interactive-dim-group:hover .blueprint-dim-text,
              .interactive-dim-group.highlighted .blueprint-dim-text { fill: ${dimColorHover} !important; text-shadow: 0 0 4px ${dimColorHover}60; }
              .interactive-dim-group:hover .blueprint-dim-line,
              .interactive-dim-group.highlighted .blueprint-dim-line { stroke: ${dimColorHover} !important; stroke-width: 1.25; }
            `}</style>
            
            <defs>
              <pattern id="blueprint-grid-round" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(59, 130, 246, 0.03)" strokeWidth="0.5" />
              </pattern>
              <linearGradient id="wire-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#b45309" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
            </defs>
            
            {/* Viewport border and stationary background grid */}
            <rect width="200" height="200" fill="rgba(4, 6, 12, 0.3)" stroke="rgba(30, 41, 59, 0.5)" strokeWidth="0.75" rx="6" />
            <rect width="200" height="200" fill="url(#blueprint-grid-round)" rx="6" pointerEvents="none" />
            
            {/* Pan & Zoom interactive group */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} transform-origin={`${cx} ${cy}`}>
              <line x1={cx} y1="10" x2={cx} y2="190" className="blueprint-axis" />
              <line x1="10" y1={cy} x2="190" y2={cy} className="blueprint-axis" />
              
              {viewMode === 'extrusion' ? (
                <>
                  {die.punched_size && (
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r="55" 
                      fill="none" 
                      className={`blueprint-outline-secondary transition-all duration-300 ${
                        activeHighlight === 'punched_size' ? 'stroke-indigo-400 stroke-[2px] drop-shadow-[0_0_6px_rgba(99,102,241,0.6)]' : ''
                      }`} 
                    />
                  )}
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r={55 * (parseFloat(die.current_size || '0') / parseFloat(die.punched_size || die.current_size || '1'))} 
                    fill="rgba(59, 130, 246, 0.03)" 
                    className="blueprint-outline animate-dash" 
                  />
                  <circle cx={cx} cy={cy} r="2.5" fill="#3b82f6" />
                  
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
                    <line x1={cx - 55} y1={cy} x2={cx + 55} y2={cy} className="blueprint-dim-line" strokeDasharray="3 3" />
                    <path d={`M ${cx - 55} ${cy} L ${cx - 49} ${cy - 2.5} L ${cx - 49} ${cy + 2.5} Z`} fill={dimColor} />
                    <path d={`M ${cx + 55} ${cy} L ${cx + 49} ${cy - 2.5} L ${cx + 49} ${cy + 2.5} Z`} fill={dimColor} />
                    <rect x={cx - 25} y={cy - 7} width="50" height="14" rx="2" fill="#04060c" />
                    <text x={cx} y={cy + 3} textAnchor="middle" className="blueprint-dim-text">
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
                      <line x1={cx} y1={cy - 55} x2={cx + 35} y2={cy - 55} className="blueprint-dim-line" />
                      <circle cx={cx} cy={cy - 55} r="1.5" fill={dimColor} />
                      <text x={cx + 40} y={cy - 52} className="blueprint-dim-text" textAnchor="start">
                        Punched: Ø {die.punched_size}
                      </text>
                    </g>
                  )}
                </>
              ) : (
                <>
                  {/* Cross-Section View of Drawing Die (ROUND) */}
                  {(() => {
                    const currentDia = parseFloat(die.current_size || '1')
                    const punchedDia = parseFloat(die.punched_size || die.current_size || '1.2')
                    const inletDia = die.inlet_size ? parseFloat(die.inlet_size) : punchedDia
                    const d = die.inlet_size && inletDia > currentDia
                      ? 52 * (currentDia / inletDia)
                      : 42 * (currentDia / punchedDia)
                    
                    return (
                      <>
                        {/* Shaded Wire */}
                        <path 
                          d={`M ${cx - 26} 20 L ${cx + 26} 20 L ${cx + 26} 65 L ${cx + d/2} 95 L ${cx + d/2} 175 L ${cx - d/2} 175 L ${cx - d/2} 95 L ${cx - 26} 65 Z`} 
                          fill="url(#wire-gradient)" 
                          opacity="0.25" 
                        />
                        
                        {/* Left Die Profile block */}
                        <path 
                          d={`M 25 40 L 25 160 L ${cx - d/2 - 20} 160 L ${cx - d/2 - 12} 145 L ${cx - d/2} 120 L ${cx - d/2} 95 L ${cx - d/2 - 20} 65 L ${cx - d/2 - 25} 40 Z`} 
                          fill="rgba(59, 130, 246, 0.05)" 
                          stroke="rgba(59, 130, 246, 0.4)" 
                          strokeWidth="1.25" 
                        />
                        
                        {/* Right Die Profile block */}
                        <path 
                          d={`M 175 40 L 175 160 L ${cx + d/2 + 20} 160 L ${cx + d/2 + 12} 145 L ${cx + d/2} 120 L ${cx + d/2} 95 L ${cx + d/2 + 20} 65 L ${cx + d/2 + 25} 40 Z`} 
                          fill="rgba(59, 130, 246, 0.05)" 
                          stroke="rgba(59, 130, 246, 0.4)" 
                          strokeWidth="1.25" 
                        />

                        {/* Diameter measurement */}
                        <g
                          className="interactive-dim-group"
                          role="button"
                          tabIndex={0}
                          onClick={() => handleDimClick(
                            "Bearing Diameter (D)",
                            "Diameter of the calibrated straight cylindrical sizing zone (mm).",
                            "This defines the final calibration dimension of the finished wire."
                          )}
                          onMouseEnter={() => handleDimMouseEnter(
                            "Bearing Diameter (D)",
                            "Diameter of the calibrated straight cylindrical sizing zone (mm).",
                            "This defines the final calibration dimension of the finished wire."
                          )}
                          onMouseLeave={handleDimMouseLeave}
                        >
                          <line x1={cx - d/2} y1="107.5" x2={cx + d/2} y2="107.5" className="blueprint-dim-line" />
                          <path d={`M ${cx - d/2} 107.5 L ${cx - d/2 + 4} 105 L ${cx - d/2 + 4} 110 Z`} fill={dimColor} />
                          <path d={`M ${cx + d/2} 107.5 L ${cx + d/2 - 4} 105 L ${cx + d/2 - 4} 110 Z`} fill={dimColor} />
                          <rect x={cx - 20} y="100.5" width="40" height="13" rx="2" fill="#04060c" />
                          <text x={cx} y="109.5" textAnchor="middle" className="blueprint-dim-text">
                            Ø {die.current_size}
                          </text>
                        </g>

                        {/* Bearing Length measurement */}
                        <g
                          className="interactive-dim-group"
                          role="button"
                          tabIndex={0}
                          onClick={() => handleDimClick(
                            "Bearing Sizing Length (Lb)",
                            "The straight cylinder section length of the die sizing channel.",
                            "Standard design: Lb = 0.3D to 0.5D depending on the wire alloy and draw speed."
                          )}
                          onMouseEnter={() => handleDimMouseEnter(
                            "Bearing Sizing Length (Lb)",
                            "The straight cylinder section length of the die sizing channel.",
                            "Standard design: Lb = 0.3D to 0.5D depending on the wire alloy and draw speed."
                          )}
                          onMouseLeave={handleDimMouseLeave}
                        >
                          <line x1={cx - d/2 - 10} y1="95" x2={cx - d/2 - 10} y2="120" className="blueprint-dim-line" />
                          <line x1={cx - d/2 - 14} y1="95" x2={cx - d/2 - 6} y2="95" className="blueprint-dim-line" strokeWidth="0.5" />
                          <line x1={cx - d/2 - 14} y1="120" x2={cx - d/2 - 6} y2="120" className="blueprint-dim-line" strokeWidth="0.5" />
                          <path d={`M ${cx - d/2 - 10} 95 L ${cx - d/2 - 12} 99 L ${cx - d/2 - 8} 99 Z`} fill={dimColor} />
                          <path d={`M ${cx - d/2 - 10} 120 L ${cx - d/2 - 12} 116 L ${cx - d/2 - 8} 116 Z`} fill={dimColor} />
                          <text x={cx - d/2 - 15} y="110.5" textAnchor="end" className="blueprint-dim-text">
                            Lb: {(parseFloat(die.current_size || '0') * 0.4).toFixed(2)}
                          </text>
                        </g>
                        
                        {/* Approach Angle Label */}
                        <text x={cx + d/2 + 25} y="78" className="blueprint-dim-text" fill="rgba(16, 185, 129, 0.75)" textAnchor="start">
                          2α = 14° (Cone)
                        </text>
                      </>
                    )
                  })()}
                </>
              )}
            </g>
          </svg>
        ) : (
          (() => {
            const width = parseFloat(die.current_width || '0')
            const thickness = parseFloat(die.current_thickness || '0')
            const origWidth = parseFloat(die.punched_width || die.current_width || '1')
            const origThick = parseFloat(die.punched_thickness || die.current_thickness || '1')
            const radius = parseFloat(die.radius || '0')

            const maxVal = Math.max(origWidth, origThick)
            const scale = 90 / maxVal
            const w = width * scale
            const t = thickness * scale
            const ow = origWidth * scale
            const ot = origThick * scale
            const r = Math.min(radius * scale, Math.min(w, t) / 2)

            const x = cx - w / 2
            const y = cy - t / 2
            const ox = cx - ow / 2
            const oy = cy - ot / 2

            return (
              <svg 
                className="w-full max-w-[230px] h-[230px] transition-shadow duration-300" 
                viewBox="0 0 200 200"
                onMouseDown={isRoot ? handleMouseDown : undefined}
                onMouseMove={isRoot ? handleMouseMove : undefined}
                onMouseUp={isRoot ? handleMouseUp : undefined}
                onMouseLeave={isRoot ? handleMouseUp : undefined}
                style={{ cursor: isRoot ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
              >
                <style>{`
                  .blueprint-axis { stroke: rgba(59, 130, 246, 0.08); stroke-width: 0.75; stroke-dasharray: 3 3; }
                  .blueprint-outline { stroke: #3b82f6; stroke-width: 2; fill: none; }
                  .blueprint-outline-secondary { stroke: rgba(59, 130, 246, 0.35); stroke-width: 1.25; stroke-dasharray: 4 2; fill: none; }
                  .blueprint-dim-line { stroke: ${dimColor}; stroke-width: 0.85; fill: none; }
                  .blueprint-dim-text { fill: ${dimColor}; font-family: monospace; font-size: 11px; font-weight: 600; }
                  .interactive-dim-group:hover .blueprint-dim-text,
                  .interactive-dim-group.highlighted .blueprint-dim-text { fill: ${dimColorHover} !important; text-shadow: 0 0 4px ${dimColorHover}60; }
                  .interactive-dim-group:hover .blueprint-dim-line,
                  .interactive-dim-group.highlighted .blueprint-dim-line { stroke: ${dimColorHover} !important; stroke-width: 1.25; }
                `}</style>
                
                <defs>
                  <pattern id="blueprint-grid-flat" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(59, 130, 246, 0.03)" strokeWidth="0.5" />
                  </pattern>
                  <linearGradient id="wire-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#b45309" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>
                </defs>

                {/* Viewport background */}
                <rect width="200" height="200" fill="rgba(4, 6, 12, 0.3)" stroke="rgba(30, 41, 59, 0.5)" strokeWidth="0.75" rx="6" />
                <rect width="200" height="200" fill="url(#blueprint-grid-flat)" rx="6" pointerEvents="none" />

                {/* Pan & Zoom group */}
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} transform-origin={`${cx} ${cy}`}>
                  <line x1={cx} y1="10" x2={cx} y2="190" className="blueprint-axis" />
                  <line x1="10" y1={cy} x2="190" y2={cy} className="blueprint-axis" />
                  
                  {viewMode === 'extrusion' ? (
                    <>
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
                            activeHighlight === 'punched_width_thickness' ? 'stroke-indigo-400 stroke-[2px] drop-shadow-[0_0_6px_rgba(99,102,241,0.6)]' : ''
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
                        fill="rgba(59, 130, 246, 0.03)" 
                        className="blueprint-outline animate-dash" 
                      />
                      <circle cx={cx} cy={cy} r="2.5" fill="#3b82f6" />
                      
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
                        <line x1={x} y1={y + t + 8} x2={x} y2={y + t + 20} className="blueprint-dim-line" strokeWidth="0.5" />
                        <line x1={x + w} y1={y + t + 8} x2={x + w} y2={y + t + 20} className="blueprint-dim-line" strokeWidth="0.5" />
                        <path d={`M ${x} ${y + t + 15} L ${x + 5} ${y + t + 13} L ${x + 5} ${y + t + 17} Z`} fill={dimColor} />
                        <path d={`M ${x + w} ${y + t + 15} L ${x + w - 5} ${y + t + 13} L ${x + w - 5} ${y + t + 17} Z`} fill={dimColor} />
                        <rect x={cx - 25} y={y + t + 8} width="50" height="14" rx="2" fill="#04060c" />
                        <text x={cx} y={y + t + 18} textAnchor="middle" className="blueprint-dim-text">
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
                        <line x1={x - 20} y1={y} x2={x - 8} y2={y} className="blueprint-dim-line" strokeWidth="0.5" />
                        <line x1={x - 20} y1={y + t} x2={x - 8} y2={y + t} className="blueprint-dim-line" strokeWidth="0.5" />
                        <path d={`M ${x - 15} ${y} L ${x - 17.5} ${y + 5} L ${x - 12.5} ${y + 5} Z`} fill={dimColor} />
                        <path d={`M ${x - 15} ${y + t} L ${x - 17.5} ${y + t - 5} L ${x - 12.5} ${y + t - 5} Z`} fill={dimColor} />
                        <text x={x - 18} y={cy + 3} textAnchor="end" className="blueprint-dim-text">
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
                          <path d={`M ${x + w - r + r * Math.cos(Math.PI/4)} ${y + r - r * Math.sin(Math.PI/4)} L ${x + w + 10} ${y - 10}`} className="blueprint-dim-line" fill="none" strokeWidth="0.75" />
                          <circle cx={x + w - r + r * Math.cos(Math.PI/4)} cy={y + r - r * Math.sin(Math.PI/4)} r="1.5" fill={dimColor} />
                          <text x={x + w + 14} y={y - 7} className="blueprint-dim-text" textAnchor="start">
                            R: {die.radius}
                          </text>
                        </g>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Cross-Section View of Flat Ribbon Die (Showing thickness profile) */}
                      {(() => {
                        const d = t
                        
                        return (
                          <>
                            {/* Shaded Wire */}
                            <path 
                              d={`M ${cx - 26} 20 L ${cx + 26} 20 L ${cx + 26} 65 L ${cx + d/2} 95 L ${cx + d/2} 175 L ${cx - d/2} 175 L ${cx - d/2} 95 L ${cx - 26} 65 Z`} 
                              fill="url(#wire-gradient)" 
                              opacity="0.25" 
                            />
                            
                            {/* Left Die block */}
                            <path 
                              d={`M 25 40 L 25 160 L ${cx - d/2 - 20} 160 L ${cx - d/2 - 12} 145 L ${cx - d/2} 120 L ${cx - d/2} 95 L ${cx - d/2 - 20} 65 L ${cx - d/2 - 25} 40 Z`} 
                              fill="rgba(59, 130, 246, 0.05)" 
                              stroke="rgba(59, 130, 246, 0.4)" 
                              strokeWidth="1.25" 
                            />
                            
                            {/* Right Die block */}
                            <path 
                              d={`M 175 40 L 175 160 L ${cx + d/2 + 20} 160 L ${cx + d/2 + 12} 145 L ${cx + d/2} 120 L ${cx + d/2} 95 L ${cx + d/2 + 20} 65 L ${cx + d/2 + 25} 40 Z`} 
                              fill="rgba(59, 130, 246, 0.05)" 
                              stroke="rgba(59, 130, 246, 0.4)" 
                              strokeWidth="1.25" 
                            />

                            {/* Thickness/Gap measurement */}
                            <g
                              className="interactive-dim-group"
                              role="button"
                              tabIndex={0}
                              onClick={() => handleDimClick(
                                "Bearing Thickness gap (T)",
                                "The output thickness gap dimension of the flat calibration channel (mm).",
                                "This manages flat ribbon wire thickness and edge sizing."
                              )}
                              onMouseEnter={() => handleDimMouseEnter(
                                "Bearing Thickness gap (T)",
                                "The output thickness gap dimension of the flat calibration channel (mm).",
                                "This manages flat ribbon wire thickness and edge sizing."
                              )}
                              onMouseLeave={handleDimMouseLeave}
                            >
                              <line x1={cx - d/2} y1="107.5" x2={cx + d/2} y2="107.5" className="blueprint-dim-line" />
                              <path d={`M ${cx - d/2} 107.5 L ${cx - d/2 + 4} 105 L ${cx - d/2 + 4} 110 Z`} fill={dimColor} />
                              <path d={`M ${cx + d/2} 107.5 L ${cx + d/2 - 4} 105 L ${cx + d/2 - 4} 110 Z`} fill={dimColor} />
                              <rect x={cx - 20} y="100.5" width="40" height="13" rx="2" fill="#04060c" />
                              <text x={cx} y="109.5" textAnchor="middle" className="blueprint-dim-text">
                                T: {die.current_thickness}
                              </text>
                            </g>

                            {/* Bearing length info */}
                            <text x={cx - d/2 - 15} y="110.5" textAnchor="end" className="blueprint-dim-text">
                              Lb: {(parseFloat(die.current_thickness || '0') * 0.45).toFixed(2)}
                            </text>
                            <line x1={cx - d/2 - 10} y1="95" x2={cx - d/2 - 10} y2="120" className="blueprint-dim-line" strokeDasharray="2 2" />
                          </>
                        )
                      })()}
                    </>
                  )}
                </g>
              </svg>
            )
          })()
        )}
      </div>
      
      {/* Footer Meta */}
      <div className="flex justify-between items-center text-slate-600 text-xs font-mono select-none mt-6 pt-3 border-t border-slate-900/60 w-full">
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
        <div className="absolute inset-x-4 bottom-4 bg-[#03060c]/98 backdrop-blur-md border border-slate-800 rounded-lg p-3 text-xs shadow-2xl z-10 animate-fadeIn">
          <div className="flex justify-between items-start mb-1.5">
            <h4 className="text-blue-400 font-mono text-xs uppercase font-bold tracking-wider">{activeTooltip.title}</h4>
            <div className="flex items-center gap-1.5 select-none">
              {activeTooltip.isPinned ? (
                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1 py-0.2 rounded font-semibold font-mono border border-blue-500/20">Pinned</span>
              ) : (
                <span className="text-[10px] bg-slate-900 text-slate-500 px-1 py-0.2 rounded font-semibold font-mono border border-slate-800">Hovering</span>
              )}
              <button 
                onClick={() => setActiveTooltip(null)} 
                className="text-slate-450 hover:text-white transition-colors font-bold text-sm leading-none"
                aria-label="Close tooltip"
              >
                &times;
              </button>
            </div>
          </div>
          <p className="text-slate-300 font-medium mb-1 leading-relaxed text-xs">{activeTooltip.content}</p>
          {activeTooltip.isPinned && (
            <div className="text-xs text-slate-500 border-t border-slate-900/60 pt-1.5 mt-1.5 leading-normal animate-slideDown">
              <strong className="text-slate-400">Engineering Note:</strong> {activeTooltip.details}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
