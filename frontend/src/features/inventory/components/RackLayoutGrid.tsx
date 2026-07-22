import React, { useState } from 'react'
import { Database, Move, ArrowRightLeft, ShieldAlert } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '../../../hooks/useApi'

interface Die {
  die_id: string
  die_type: string
  status: string
  rack?: number | null
  rack_id?: number | null
  rack_name?: string
  shelf?: number | null
  current_size?: string
  current_width?: string
  current_thickness?: string
  casing?: string
}

interface RackLayoutGridProps {
  dies: Die[]
  onMoveDie: (dieId: string, rackId: number | null, shelf: number | null) => void
  canMove: boolean
  navigate: (path: string) => void
}

export function RackLayoutGrid({ dies, onMoveDie, canMove, navigate }: RackLayoutGridProps) {
  const [draggedDieId, setDraggedDieId] = useState<string | null>(null)
  const [dragOverCell, setDragOverCell] = useState<string | null>(null) // "rack-shelf"
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [assigningDieId, setAssigningDieId] = useState<string | null>(null)
  const [selectedRackId, setSelectedRackId] = useState<number | null>(null)
  const [selectedShelf, setSelectedShelf] = useState<number>(1)

  const [pickedUpDie, setPickedUpDie] = useState<Die | null>(null)
  const [targetCell, setTargetCell] = useState<{ rack: string; shelf: string } | null>(null)

  const { request } = useApi()
  const { data: racksList } = useQuery({
    queryKey: ['racksList'],
    queryFn: () => request('/api/racks/')
  })
  const racks = racksList || []

  // Parse location using structured fields
  const parsedDies = dies.map(die => {
    const rId = die.rack_id || die.rack
    if (rId && die.rack_name && die.shelf !== null && die.shelf !== undefined) {
      return {
        die,
        rack: `Rack ${die.rack_name.toUpperCase()}`,
        shelf: `Shelf ${die.shelf}`
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
      case 'SCRAPPED': return 'bg-slate-650'
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

  const handleDrop = (e: React.DragEvent, rackName: string, shelfName: string) => {
    if (!canMove) return
    e.preventDefault()
    const dieId = e.dataTransfer.getData('text/plain') || draggedDieId
    if (dieId) {
      const shelfNum = Number(shelfName.replace(/Shelf\s+/i, ''))
      const pureRackName = rackName.replace(/Rack\s+/i, '').trim()
      const matchedRack = racks.find((r: any) => r.name.toLowerCase() === pureRackName.toLowerCase())
      
      if (matchedRack) {
        onMoveDie(dieId, matchedRack.id, shelfNum)
      } else {
        onMoveDie(dieId, null, null)
      }
    }
    setDragOverCell(null)
    setDraggedDieId(null)
  }

  const handleDropUnallocated = (e: React.DragEvent) => {
    if (!canMove) return
    e.preventDefault()
    const dieId = e.dataTransfer.getData('text/plain') || draggedDieId
    if (dieId) {
      onMoveDie(dieId, null, null)
    }
    setDragOverCell(null)
    setDraggedDieId(null)
  }

  const handleDieKeyDown = (e: React.KeyboardEvent, die: Die, currentRack: string | null, currentShelf: string | null) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault()
      if (!canMove) return

      if (pickedUpDie && pickedUpDie.die_id === die.die_id) {
        setPickedUpDie(null)
        setTargetCell(null)
      } else {
        setPickedUpDie(die)
        setTargetCell({
          rack: currentRack || allRacks[0],
          shelf: currentShelf || allShelves[0]
        })
      }
    }
  }

  React.useEffect(() => {
    if (!pickedUpDie) return

    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (!targetCell) return

      const rackIdx = allRacks.indexOf(targetCell.rack)
      const shelfIdx = allShelves.indexOf(targetCell.shelf)

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        const nextRackIdx = Math.min(allRacks.length - 1, rackIdx + 1)
        setTargetCell({ rack: allRacks[nextRackIdx], shelf: targetCell.shelf })
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const nextRackIdx = Math.max(0, rackIdx - 1)
        setTargetCell({ rack: allRacks[nextRackIdx], shelf: targetCell.shelf })
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        const nextShelfIdx = Math.min(allShelves.length - 1, shelfIdx + 1)
        setTargetCell({ rack: targetCell.rack, shelf: allShelves[nextShelfIdx] })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const nextShelfIdx = Math.max(0, shelfIdx - 1)
        setTargetCell({ rack: targetCell.rack, shelf: allShelves[nextShelfIdx] })
      } else if (e.key === ' ') {
        e.preventDefault()
        const shelfNum = Number(targetCell.shelf.replace(/Shelf\s+/i, ''))
        const pureRackName = targetCell.rack.replace(/Rack\s+/i, '').trim()
        const matchedRack = racks.find((r: any) => r.name.toLowerCase() === pureRackName.toLowerCase())
        
        if (matchedRack) {
          onMoveDie(pickedUpDie.die_id, matchedRack.id, shelfNum)
        } else {
          onMoveDie(pickedUpDie.die_id, null, null)
        }
        setPickedUpDie(null)
        setTargetCell(null)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setPickedUpDie(null)
        setTargetCell(null)
      }
    }

    window.addEventListener('keydown', handleGlobalKeys)
    return () => window.removeEventListener('keydown', handleGlobalKeys)
  }, [pickedUpDie, targetCell, allRacks, allShelves, racks])

  return (
    <div className="flex flex-col gap-6 animate-fadeIn w-full">
      {pickedUpDie && (
        <div className="p-4 bg-orange-950/80 border border-orange-500/20 rounded-2xl flex items-center justify-between shadow-lg shadow-orange-950/15">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400 dot-glow glow-orange animate-pulse shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-white">Relocating Die <span className="font-mono text-orange-350">{pickedUpDie.die_id}</span></p>
              <p className="text-slate-400 mt-0.5 font-medium">Use arrow keys to traverse cells. Press <kbd className="bg-slate-900 border border-slate-805 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-200">Space</kbd> to drop, <kbd className="bg-slate-900 border border-slate-805 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-200">Esc</kbd> to cancel.</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-orange-450 font-mono bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-md">
            Targeting: {targetCell?.rack} - {targetCell?.shelf}
          </span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
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
                    const isTarget = targetCell && targetCell.rack === rack && targetCell.shelf === shelf

                    return (
                      <div
                        key={key}
                        onDragOver={(e) => handleDragOver(e, rack, shelf)}
                        onDragLeave={() => setDragOverCell(null)}
                        onDrop={(e) => handleDrop(e, rack, shelf)}
                        className={`min-h-[90px] p-2 rounded-xl border transition-all duration-300 flex flex-col justify-start gap-1.5 ${
                          isOver
                            ? 'bg-blue-600/10 border-blue-500/80 shadow-[0_0_12px_rgba(59,130,246,0.25)] ring-2 ring-blue-500/25'
                            : isTarget
                            ? 'border-orange-500 bg-orange-600/10 ring-2 ring-orange-500/30 shadow-[0_0_12px_rgba(249,115,22,0.35)] animate-pulse'
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
                              tabIndex={0}
                              onKeyDown={(e) => handleDieKeyDown(e, die, rack, shelf)}
                              className={`group relative flex items-center justify-between p-1.5 rounded-lg border bg-slate-900 border-slate-800 cursor-pointer transition-all duration-200 select-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                draggedDieId === die.die_id ? 'opacity-40' : 'hover:border-blue-500/50 hover:bg-slate-850'
                              } ${
                                pickedUpDie?.die_id === die.die_id ? 'ring-2 ring-orange-500 bg-orange-950/40 border-orange-500 opacity-80' : ''
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
      {isSidebarCollapsed ? (
        <div className="w-full lg:w-16 bg-slate-900/60 border border-slate-800/60 rounded-2xl p-3 shadow-xl flex flex-col items-center max-h-[500px]">
          <button 
            type="button"
            onClick={() => setIsSidebarCollapsed(false)}
            className="p-2 hover:bg-slate-800 rounded-xl transition text-amber-500 relative"
            title="Expand Unassigned Sidebar"
          >
            <Move className="h-6 w-6" />
            {unallocatedDies.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-extrabold rounded-full h-5 w-5 flex items-center justify-center text-[10px] shadow-md border border-slate-900 animate-pulse">
                {unallocatedDies.length}
              </span>
            )}
          </button>
        </div>
      ) : (
        <div className="w-full lg:w-80 bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5 shadow-xl flex flex-col max-h-[500px] transition-all duration-300">
          <div className="flex justify-between items-center mb-4 border-b border-slate-800/60 pb-3">
            <div className="flex items-center space-x-2 min-w-0">
              <Move className="h-4.5 w-4.5 text-amber-500 shrink-0" />
              <span className="text-sm font-extrabold text-white truncate">Unassigned Dies</span>
              <span className="bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded-full text-[10px] border border-amber-500/20">
                {unallocatedDies.length}
              </span>
            </div>
            <button 
              type="button"
              onClick={() => { setIsSidebarCollapsed(true); setAssigningDieId(null); }}
              className="text-slate-400 hover:text-slate-200 text-xs font-semibold px-2 py-1 hover:bg-slate-800 rounded-lg transition"
            >
              Collapse
            </button>
          </div>
          
          <p className="text-slate-500 text-xxs mb-4 leading-relaxed font-sans">
            Dies not mapped to standard rack locations. Click a die to assign to a cell, or drag-and-drop onto map.
          </p>

          {/* Drop back zone */}
          {draggedDieId && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropUnallocated}
              className="mb-4 p-3 bg-amber-500/10 border-2 border-dashed border-amber-500/40 hover:border-amber-500/80 rounded-xl text-center text-xxs font-bold text-amber-400 animate-pulse transition cursor-pointer flex items-center justify-center space-x-1"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>Drop here to deallocate</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {unallocatedDies.length === 0 ? (
              <div className="text-center py-12 text-slate-550 text-xs italic border border-slate-850 rounded-xl">
                All dies are mapped to standard racks.
              </div>
            ) : (
              unallocatedDies.map(die => {
                const isAssigning = assigningDieId === die.die_id
                return (
                  <div key={die.die_id} className="space-y-2">
                    <div
                      draggable={canMove}
                      onDragStart={(e) => handleDragStart(e, die.die_id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (canMove) {
                          setAssigningDieId(isAssigning ? null : die.die_id)
                          if (racks.length > 0) {
                            setSelectedRackId(racks[0].id)
                          }
                          setSelectedShelf(1)
                        } else {
                          navigate(`/dies/${die.die_id}`)
                        }
                      }}
                      tabIndex={0}
                      onKeyDown={(e) => handleDieKeyDown(e, die, null, null)}
                      className={`flex items-center justify-between p-3 rounded-xl border bg-slate-950 transition select-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isAssigning 
                          ? 'border-blue-500 bg-slate-900/20' 
                          : draggedDieId === die.die_id 
                          ? 'opacity-40 border-slate-800' 
                          : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/40 cursor-pointer'
                      } ${
                        pickedUpDie?.die_id === die.die_id ? 'ring-2 ring-orange-500 bg-orange-950/40 border-orange-500 opacity-80' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${getStatusDotColor(die.status)}`} />
                        <div className="text-left min-w-0">
                          <div className="text-xs font-extrabold font-mono text-white truncate">
                            {die.die_id}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            Loc: {die.rack_name && die.shelf ? `${die.rack_name} - Shelf ${die.shelf}` : 'None'}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {die.die_type === 'ROUND' 
                          ? `${die.current_size || '—'}mm` 
                          : `${die.current_width || '—'}×${die.current_thickness || '—'}`}
                      </span>
                    </div>

                    {/* Inline Set Location selector */}
                    {isAssigning && (
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3 animate-fadeIn">
                        <div className="text-xxs font-bold text-slate-400 uppercase tracking-wider">Assign to Cell:</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-500 block mb-1">RACK</label>
                            <select
                              value={selectedRackId || ''}
                              onChange={(e) => setSelectedRackId(Number(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-800 text-xs text-white rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              {racks.map((r: any) => (
                                <option key={r.id} value={r.id}>
                                  Rack {r.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-500 block mb-1">SHELF</label>
                            <select
                              value={selectedShelf}
                              onChange={(e) => setSelectedShelf(Number(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-800 text-xs text-white rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value={1}>Shelf 1</option>
                              <option value={2}>Shelf 2</option>
                              <option value={3}>Shelf 3</option>
                              <option value={4}>Shelf 4</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => setAssigningDieId(null)}
                            className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-md border border-slate-800 transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const rObj = racks.find((r: any) => r.id === selectedRackId)
                              if (rObj) {
                                onMoveDie(
                                  die.die_id,
                                  rObj.id,
                                  selectedShelf
                                )
                              }
                              setAssigningDieId(null)
                            }}
                            className="px-3 py-1 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-md transition"
                          >
                            Assign
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
