import React, { useState } from 'react'
import { Database, Move, ArrowRightLeft } from 'lucide-react'
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
      case 'AVAILABLE': return 'bg-[#10b981]'
      case 'RUNNING': return 'bg-[#3b82f6]'
      case 'CLEANING': return 'bg-[#f59e0b]'
      case 'POLISHING': return 'bg-[#8b5cf6]'
      case 'DAMAGED': return 'bg-[#f97316]'
      case 'SCRAPPED': return 'bg-[#ef4444]'
      default: return 'bg-[#6b7280]'
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
    <div className="flex flex-col gap-4 w-full font-mono">
      {pickedUpDie && (
        <div className="p-3 bg-[#141414] border border-[#2a2a2a] border-l-2 border-l-amber-500 rounded-sm flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <div className="text-xs">
              <p className="font-medium text-[#e4e4e4] uppercase">RELOCATING DIE <span className="text-blue-400 font-bold">{pickedUpDie.die_id}</span></p>
              <p className="text-[#6b7280] text-[10px] mt-0.5">Use arrow keys. Press <kbd className="bg-[#0a0a0a] border border-[#2a2a2a] px-1 py-0.2 rounded-sm text-[9px] text-[#e4e4e4]">SPACE</kbd> to drop, <kbd className="bg-[#0a0a0a] border border-[#2a2a2a] px-1 py-0.2 rounded-sm text-[9px] text-[#e4e4e4]">ESC</kbd> to cancel.</p>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-[#0a0a0a] border border-[#2a2a2a] text-amber-400 px-2 py-0.5 rounded-sm uppercase">
            TARGET: {targetCell?.rack} - {targetCell?.shelf}
          </span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        {/* LEFT: Grid Layout Map */}
        <div className="flex-1 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 overflow-x-auto font-mono">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-1.5">
              <Database className="h-4 w-4 text-blue-500" />
              <h3 className="text-xs font-medium uppercase tracking-[0.05em] text-[#e4e4e4]">01 RACK LOCATION MATRIX</h3>
            </div>
            <span className="text-[#6b7280] text-[10px] uppercase">DRAG & DROP NODES TO REASSIGN</span>
          </div>

          <div className="min-w-[600px]">
            {/* Grid Layout Table */}
            <div className="grid gap-2" style={{ gridTemplateColumns: `70px repeat(${allRacks.length}, minmax(110px, 1fr))` }}>
              {/* Header Row */}
              <div className="flex items-center justify-end pr-2 text-[#6b7280] font-medium text-[10px] tracking-wider uppercase">
                SHELF
              </div>
              {allRacks.map(rack => (
                <div key={rack} className="text-center font-medium text-xs text-[#e4e4e4] py-1.5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm uppercase">
                  {rack}
                </div>
              ))}

              {/* Shelf Rows */}
              {allShelves.map(shelf => (
                <React.Fragment key={shelf}>
                  {/* Row Label */}
                  <div className="flex items-center justify-end pr-2 font-medium text-xs text-[#6b7280] uppercase">
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
                        className={`min-h-[80px] p-1.5 rounded-sm border transition-colors flex flex-col justify-start gap-1 font-mono ${
                          isOver
                            ? 'bg-[#141414] border-blue-500'
                            : isTarget
                            ? 'border-amber-500 bg-[#141414]'
                            : 'bg-[#0a0a0a] border-[#1a1a1a] hover:border-[#2a2a2a]'
                        }`}
                      >
                        {cellDies.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center text-[#404040] text-[10px] uppercase select-none">
                            EMPTY
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
                              className={`group relative flex items-center justify-between p-1 rounded-sm border bg-[#0f0f0f] border-[#2a2a2a] cursor-pointer transition-colors select-none focus:outline-none focus:border-blue-500 ${
                                draggedDieId === die.die_id ? 'opacity-30' : 'hover:bg-[#141414]'
                              } ${
                                pickedUpDie?.die_id === die.die_id ? 'border-amber-500 bg-[#141414]' : ''
                              }`}
                            >
                            <div className="flex items-center space-x-1.5 min-w-0">
                              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${getStatusDotColor(die.status)}`} />
                              <span className="text-[10px] font-bold font-mono text-[#e4e4e4] truncate">
                                {die.die_id}
                              </span>
                            </div>
                            <span className="text-[9px] text-[#6b7280] group-hover:text-blue-400 font-mono transition-colors">
                              {die.die_type === 'ROUND' 
                                ? `${die.current_size || '—'}mm` 
                                : `${die.current_width || '—'}×${die.current_thickness || '—'}`}
                            </span>

                            {/* Floating Card Tooltip */}
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block z-50 bg-[#0f0f0f] border border-[#2a2a2a] p-2 rounded-sm text-[10px] w-44 text-left leading-normal font-mono shadow-none">
                              <div className="font-bold text-[#e4e4e4] mb-1 border-b border-[#1a1a1a] pb-0.5">
                                DIE {die.die_id}
                              </div>
                              <div className="text-[#6b7280]">TYPE: <span className="text-[#e4e4e4]">{die.die_type}</span></div>
                              <div className="text-[#6b7280]">STATUS: <span className="text-[#e4e4e4]">{die.status}</span></div>
                              {die.casing && <div className="text-[#6b7280]">CASING: <span className="text-[#e4e4e4]">{die.casing}</span></div>}
                              <div className="mt-1 text-[#404040] uppercase text-[9px]">Click for detail specifications</div>
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
        <div className="w-full lg:w-12 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-2 flex flex-col items-center max-h-[500px]">
          <button 
            type="button"
            onClick={() => setIsSidebarCollapsed(false)}
            className="p-1.5 hover:bg-[#141414] rounded-sm transition text-amber-500 relative"
            title="Expand Unassigned Sidebar"
          >
            <Move className="h-5 w-5" />
            {unallocatedDies.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-black font-bold rounded-sm h-4 w-4 flex items-center justify-center text-[9px] font-mono">
                {unallocatedDies.length}
              </span>
            )}
          </button>
        </div>
      ) : (
        <div className="w-full lg:w-72 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-3.5 flex flex-col max-h-[500px] font-mono">
          <div className="flex justify-between items-center mb-3 border-b border-[#2a2a2a] pb-2">
            <div className="flex items-center space-x-1.5 min-w-0">
              <Move className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="text-xs font-medium uppercase text-[#e4e4e4] truncate">02 UNASSIGNED</span>
              <span className="bg-[#141414] text-amber-400 font-medium px-1.5 py-0.2 rounded-sm text-[9px] border border-[#2a2a2a] tabular-nums">
                {unallocatedDies.length}
              </span>
            </div>
            <button 
              type="button"
              onClick={() => { setIsSidebarCollapsed(true); setAssigningDieId(null); }}
              className="text-[#6b7280] hover:text-[#e4e4e4] text-[10px] uppercase px-1.5 py-0.5 rounded-sm transition"
            >
              Collapse
            </button>
          </div>
          
          <p className="text-[#6b7280] text-[10px] mb-3 leading-normal">
            Dies not mapped to racks. Click or drag-and-drop to place.
          </p>

          {/* Drop back zone */}
          {draggedDieId && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropUnallocated}
              className="mb-3 p-2 bg-[#141414] border border-dashed border-amber-500/50 rounded-sm text-center text-[10px] font-mono uppercase text-amber-400 transition cursor-pointer flex items-center justify-center space-x-1"
            >
              <ArrowRightLeft className="h-3 w-3" />
              <span>Drop to unassign</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
            {unallocatedDies.length === 0 ? (
              <div className="text-center py-8 text-[#6b7280] text-xs uppercase border border-[#1a1a1a] rounded-sm">
                All dies placed in racks.
              </div>
            ) : (
              unallocatedDies.map(die => {
                const isAssigning = assigningDieId === die.die_id
                return (
                  <div key={die.die_id} className="space-y-1.5">
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
                      className={`flex items-center justify-between p-2 rounded-sm border bg-[#0a0a0a] transition-colors select-none focus:outline-none focus:border-blue-500 ${
                        isAssigning 
                          ? 'border-blue-500 bg-[#141414]' 
                          : draggedDieId === die.die_id 
                          ? 'opacity-30 border-[#1a1a1a]' 
                          : 'border-[#1a1a1a] hover:border-[#2a2a2a] hover:bg-[#141414] cursor-pointer'
                      } ${
                        pickedUpDie?.die_id === die.die_id ? 'border-amber-500 bg-[#141414]' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${getStatusDotColor(die.status)}`} />
                        <div className="text-left min-w-0">
                          <div className="text-xs font-bold font-mono text-[#e4e4e4] truncate">
                            {die.die_id}
                          </div>
                          <div className="text-[9px] text-[#6b7280] truncate uppercase">
                            {die.rack_name && die.shelf ? `${die.rack_name} - S${die.shelf}` : 'NO LOC'}
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] text-[#6b7280] bg-[#141414] px-1.5 py-0.2 rounded-sm border border-[#2a2a2a] font-mono">
                        {die.die_type === 'ROUND' 
                          ? `${die.current_size || '—'}mm` 
                          : `${die.current_width || '—'}×${die.current_thickness || '—'}`}
                      </span>
                    </div>

                    {/* Inline Set Location selector */}
                    {isAssigning && (
                      <div className="p-2.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm space-y-2 font-mono">
                        <div className="text-[9px] font-medium text-[#6b7280] uppercase tracking-wider">ASSIGN TO CELL:</div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="text-[8px] text-[#6b7280] block mb-0.5 uppercase">RACK</label>
                            <select
                              value={selectedRackId || ''}
                              onChange={(e) => setSelectedRackId(Number(e.target.value))}
                              className="w-full bg-[#141414] border border-[#2a2a2a] text-xs text-[#e4e4e4] rounded-sm p-1 focus:outline-none focus:border-blue-500 font-mono"
                            >
                              {racks.map((r: any) => (
                                <option key={r.id} value={r.id}>
                                  RACK {r.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[8px] text-[#6b7280] block mb-0.5 uppercase">SHELF</label>
                            <select
                              value={selectedShelf}
                              onChange={(e) => setSelectedShelf(Number(e.target.value))}
                              className="w-full bg-[#141414] border border-[#2a2a2a] text-xs text-[#e4e4e4] rounded-sm p-1 focus:outline-none focus:border-blue-500 font-mono"
                            >
                              <option value={1}>SHELF 1</option>
                              <option value={2}>SHELF 2</option>
                              <option value={3}>SHELF 3</option>
                              <option value={4}>SHELF 4</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-1.5 justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => setAssigningDieId(null)}
                            className="px-2 py-0.5 text-[9px] uppercase font-mono text-[#6b7280] hover:text-[#e4e4e4] bg-[#141414] hover:bg-[#1f1f1f] rounded-sm border border-[#2a2a2a] transition"
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
                            className="px-2.5 py-0.5 text-[9px] uppercase font-mono text-blue-400 hover:text-blue-300 bg-[#141414] hover:bg-[#1f1f1f] border border-blue-500/50 rounded-sm transition"
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
