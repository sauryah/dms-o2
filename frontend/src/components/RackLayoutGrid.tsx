import React, { useState } from 'react'
import { Database, Move, ArrowRightLeft, ShieldAlert } from 'lucide-react'

interface Die {
  die_id: string
  die_type: string
  status: string
  location?: string
  current_size?: string
  current_width?: string
  current_thickness?: string
  casing?: string
}

interface RackLayoutGridProps {
  dies: Die[]
  onMoveDie: (dieId: string, newLocation: string) => void
  canMove: boolean
  navigate: (path: string) => void
}

export function RackLayoutGrid({ dies, onMoveDie, canMove, navigate }: RackLayoutGridProps) {
  const [draggedDieId, setDraggedDieId] = useState<string | null>(null)
  const [dragOverCell, setDragOverCell] = useState<string | null>(null) // "rack-shelf"

  // Parse location strings
  const parsedDies = dies.map(die => {
    const loc = die.location || ''
    const match = loc.match(/Rack\s+([A-Za-z0-9]+)\s*-\s*Shelf\s*([A-Za-z0-9]+)/i)
    if (match) {
      return {
        die,
        rack: `Rack ${match[1].toUpperCase()}`,
        shelf: `Shelf ${match[2]}`
      }
    }
    return {
      die,
      rack: null,
      shelf: null
    }
  })

  // Define layout structure
  const defaultRacks = ['Rack A', 'Rack B', 'Rack C', 'Rack D']
  const defaultShelves = ['Shelf 4', 'Shelf 3', 'Shelf 2', 'Shelf 1']

  const customRacks = new Set<string>()
  const customShelves = new Set<string>()

  parsedDies.forEach(d => {
    if (d.rack) customRacks.add(d.rack)
    if (d.shelf) customShelves.add(d.shelf)
  })

  const allRacks = Array.from(new Set([...defaultRacks, ...Array.from(customRacks).sort()]))
  const allShelves = Array.from(new Set([...defaultShelves, ...Array.from(customShelves).sort((a, b) => b.localeCompare(a))]))

  // Group allocated dies by cell key: "Rack X-Shelf Y"
  const cells: Record<string, Die[]> = {}
  const unallocatedDies: Die[] = []

  parsedDies.forEach(d => {
    if (d.rack && d.shelf) {
      const key = `${d.rack}-${d.shelf}`
      if (!cells[key]) {
        cells[key] = []
      }
      cells[key].push(d.die)
    } else {
      unallocatedDies.push(d.die)
    }
  })

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
      case 'RUNNING': return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
      case 'CLEANING': return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]'
      case 'POLISHING': return 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
      case 'DAMAGED': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
      case 'SCRAPPED':
      case 'SCRAP': return 'bg-slate-605'
      default: return 'bg-slate-400'
    }
  }

  const handleDragStart = (e: React.DragEvent, dieId: string) => {
    if (!canMove) return
    e.dataTransfer.setData('text/plain', dieId)
    setDraggedDieId(dieId)
  }

  const handleDragEnd = () => {
    setDraggedDieId(null)
    setDragOverCell(null)
  }

  const handleDragOver = (e: React.DragEvent, rack: string, shelf: string) => {
    if (!canMove) return
    e.preventDefault()
    setDragOverCell(`${rack}-${shelf}`)
  }

  const handleDrop = (e: React.DragEvent, rack: string, shelf: string) => {
    if (!canMove) return
    e.preventDefault()
    const dieId = e.dataTransfer.getData('text/plain') || draggedDieId
    if (dieId) {
      onMoveDie(dieId, `${rack} - ${shelf}`)
    }
    setDragOverCell(null)
    setDraggedDieId(null)
  }

  const handleDropUnallocated = (e: React.DragEvent) => {
    if (!canMove) return
    e.preventDefault()
    const dieId = e.dataTransfer.getData('text/plain') || draggedDieId
    if (dieId) {
      onMoveDie(dieId, 'General')
    }
    setDragOverCell(null)
    setDraggedDieId(null)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn">
      {/* LEFT: Grid Layout Map */}
      <div className="flex-1 bg-slate-900/60 border border-slate-800/60 rounded-2xl p-6 shadow-xl overflow-x-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-blue-500" />
            <h3 className="text-base font-extrabold text-white">Visual Rack Location Map</h3>
          </div>
          <span className="text-slate-500 text-xs font-mono">Drag and drop nodes to reassign locations</span>
        </div>

        <div className="min-w-[640px]">
          {/* Grid Layout Table */}
          <div className="grid gap-4" style={{ gridTemplateColumns: `80px repeat(${allRacks.length}, minmax(120px, 1fr))` }}>
            {/* Header Row */}
            <div className="flex items-center justify-end pr-3 text-slate-500 font-bold text-xxs tracking-wider uppercase">
              Shelf
            </div>
            {allRacks.map(rack => (
              <div key={rack} className="text-center font-bold text-xs text-slate-300 py-2 bg-slate-950/40 border border-slate-800/40 rounded-lg">
                {rack}
              </div>
            ))}

            {/* Shelf Rows */}
            {allShelves.map(shelf => (
              <React.Fragment key={shelf}>
                {/* Row Label */}
                <div className="flex items-center justify-end pr-3 font-bold text-xs text-slate-400">
                  {shelf}
                </div>

                {/* Grid Cells */}
                {allRacks.map(rack => {
                  const key = `${rack}-${shelf}`
                  const cellDies = cells[key] || []
                  const isOver = dragOverCell === key

                  return (
                    <div
                      key={key}
                      onDragOver={(e) => handleDragOver(e, rack, shelf)}
                      onDragLeave={() => setDragOverCell(null)}
                      onDrop={(e) => handleDrop(e, rack, shelf)}
                      className={`min-h-[90px] p-2 rounded-xl border transition-all duration-300 flex flex-col justify-start gap-1.5 ${
                        isOver
                          ? 'bg-blue-600/10 border-blue-500/80 shadow-[0_0_12px_rgba(59,130,246,0.25)] ring-2 ring-blue-500/25'
                          : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700/80'
                      }`}
                    >
                      {cellDies.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-slate-650 text-[10px] italic select-none">
                          Empty Slot
                        </div>
                      ) : (
                        cellDies.map(die => (
                          <div
                            key={die.die_id}
                            draggable={canMove}
                            onDragStart={(e) => handleDragStart(e, die.die_id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => navigate(`/dies/${die.die_id}`)}
                            className={`group relative flex items-center justify-between p-1.5 rounded-lg border bg-slate-900 border-slate-800 cursor-pointer transition-all duration-200 select-none ${
                              draggedDieId === die.die_id ? 'opacity-40' : 'hover:border-blue-500/50 hover:bg-slate-850'
                            }`}
                          >
                            <div className="flex items-center space-x-1.5 min-w-0">
                              <span className={`h-2 w-2 rounded-full shrink-0 ${getStatusDotColor(die.status)}`} />
                              <span className="text-[10px] font-bold font-mono text-slate-205 truncate">
                                {die.die_id}
                              </span>
                            </div>
                            <span className="text-[8px] text-slate-500 group-hover:text-blue-400 font-mono transition-colors">
                              {die.die_type === 'ROUND' 
                                ? `${die.current_size || '—'}mm` 
                                : `${die.current_width || '—'}×${die.current_thickness || '—'}`}
                            </span>

                            {/* Floating Card Tooltip */}
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 bg-slate-955/95 border border-slate-800 shadow-2xl p-2.5 rounded-lg text-[10px] w-48 text-left leading-relaxed">
                              <div className="font-bold text-white mb-1 border-b border-slate-800 pb-1">
                                Die {die.die_id}
                              </div>
                              <div>Type: {die.die_type}</div>
                              <div>Status: <span className="font-semibold text-slate-350">{die.status}</span></div>
                              {die.casing && <div>Casing: {die.casing}</div>}
                              <div className="mt-1 text-slate-500 italic">Click to view detail specifications</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: Unallocated Sidebar List */}
      <div className="w-full lg:w-80 bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5 shadow-xl flex flex-col max-h-[500px]">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Move className="h-4.5 w-4.5 text-amber-500" />
            <span>Other Locations / Unassigned</span>
          </h3>
          <p className="text-slate-550 text-xxs mt-1">Dies not in standard Rack A-D format. Drag from here onto grid.</p>
        </div>

        {/* Drop back zone */}
        {draggedDieId && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropUnallocated}
            className="mb-4 p-3 bg-amber-500/10 border-2 border-dashed border-amber-500/40 hover:border-amber-500/80 rounded-xl text-center text-xxs font-bold text-amber-400 animate-pulse transition cursor-pointer flex items-center justify-center space-x-1"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span>Drop here to allocate to General</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {unallocatedDies.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs italic border border-slate-850 rounded-xl">
              All dies are mapped to standard racks.
            </div>
          ) : (
            unallocatedDies.map(die => (
              <div
                key={die.die_id}
                draggable={canMove}
                onDragStart={(e) => handleDragStart(e, die.die_id)}
                onDragEnd={handleDragEnd}
                onClick={() => navigate(`/dies/${die.die_id}`)}
                className={`flex items-center justify-between p-3 rounded-xl border bg-slate-950 border-slate-800 hover:border-slate-700 cursor-pointer transition select-none ${
                  draggedDieId === die.die_id ? 'opacity-40' : 'hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${getStatusDotColor(die.status)}`} />
                  <div className="text-left min-w-0">
                    <div className="text-xs font-extrabold font-mono text-white truncate">
                      {die.die_id}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Loc: {die.location || 'None'}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {die.die_type === 'ROUND' 
                    ? `${die.current_size || '—'}mm` 
                    : `${die.current_width || '—'}×${die.current_thickness || '—'}`}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
