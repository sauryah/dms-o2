import React, { useState, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react'
import { 
  X, 
  Search, 
  Database, 
  ChevronDown, 
  ChevronRight, 
  Cpu, 
  Layers, 
  Sliders 
} from 'lucide-react'
import { isDieActive } from '../../../utils/dieHelpers'

export interface MachineSidebarTreeRef {
  expandAll: () => void;
  collapseAll: () => void;
}

export interface MachineSidebarTreeProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  selectedNode: { type: string; id?: any; machineId?: any } | null;
  setSelectedNode: (node: { type: string; id?: any; machineId?: any } | null) => void;
  machinesWithData: any[];
  dies: any[];
  unassignedCount: number;
  isSearchActive: boolean;
  canCreate: boolean;
  activeDragType: string | null;
  setActiveDragType: (type: string | null) => void;
  onReallocateDie: (dieId: any, setId: any) => void;
  onReallocateSet: (setId: any, machineId: any) => void;
  onReorderSets: (machineId: any, orderedSetIds: any[]) => void;
}

export const MachineSidebarTree = forwardRef<MachineSidebarTreeRef, MachineSidebarTreeProps>(
  (
    {
      isSidebarOpen,
      setIsSidebarOpen,
      isSidebarCollapsed,
      selectedNode,
      setSelectedNode,
      machinesWithData,
      dies,
      unassignedCount,
      isSearchActive,
      canCreate,
      activeDragType,
      setActiveDragType,
      onReallocateDie,
      onReallocateSet,
      onReorderSets,
    },
    ref
  ) => {
    // Local state for sidebar tree navigation
    const [treeSearch, setTreeSearch] = useState('')
    const [showEmptyNodes, setShowEmptyNodes] = useState(true)
    const [expandedMachines, setExpandedMachines] = useState<Record<string | number, boolean>>({})
    const [expandedSets, setExpandedSets] = useState<Record<string | number, boolean>>({})
    const [dragOverNode, setDragOverNode] = useState<{ type: string; id?: any } | null>(null)

    // Filtered machines list for the tree navigation search
    const filteredMachines = useMemo(() => {
      if (!treeSearch) return machinesWithData
      const query = treeSearch.toLowerCase()
      return machinesWithData.map((m: any) => {
        const matchingSets = m.sets.filter((s: any) => s.name.toLowerCase().includes(query))
        const machineMatches = m.name.toLowerCase().includes(query)
        if (machineMatches || matchingSets.length > 0) {
          return {
            ...m,
            sets: machineMatches ? m.sets : matchingSets
          }
        }
        return null
      }).filter(Boolean) as any[]
    }, [machinesWithData, treeSearch])

    // Expose expand/collapse operations to parent
    useImperativeHandle(ref, () => ({
      expandAll() {
        const nextMachs: Record<string | number, boolean> = {}
        const nextSets: Record<string | number, boolean> = {}
        machinesWithData.forEach((m: any) => {
          nextMachs[m.id] = true
          m.sets.forEach((s: any) => {
            nextSets[s.id] = true
          })
        })
        setExpandedMachines(nextMachs)
        setExpandedSets(nextSets)
      },
      collapseAll() {
        setExpandedMachines({})
        setExpandedSets({})
      }
    }))

    const toggleMachine = useCallback((id: any) => {
      setExpandedMachines((prev: Record<string | number, boolean>) => ({ ...prev, [id]: !prev[id] }))
    }, [])

    // Drag and Drop Handlers
    const handleDropOnMachine = useCallback((e: React.DragEvent, machineId: any) => {
      e.preventDefault()
      setDragOverNode(null)
      setActiveDragType(null)
      if (!canCreate) return
      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'))
        if (data.type === 'set') {
          const { id: setId, currentMachineId } = data
          if (Number(currentMachineId) === Number(machineId)) return
          onReallocateSet(setId, machineId)
        }
      } catch (err) {
        console.error(err)
      }
    }, [canCreate, onReallocateSet, setActiveDragType])

    const handleDropOnSet = useCallback((e: React.DragEvent, targetSetId: any, targetMachineId: any) => {
      e.preventDefault()
      setDragOverNode(null)
      setActiveDragType(null)
      if (!canCreate) return
      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'))
        if (data.type === 'die') {
          const { id: dieId } = data
          onReallocateDie(dieId, targetSetId)
        } else if (data.type === 'set') {
          const { id: draggedSetId } = data
          if (Number(draggedSetId) === Number(targetSetId)) return
          
          const targetMachine = machinesWithData.find((m: any) => Number(m.id) === Number(targetMachineId))
          if (targetMachine) {
            const currentSets = targetMachine.sets || []
            let orderedSetIds = currentSets.map((s: any) => s.id)
            
            // Remove the dragged set ID if it is already in this machine
            orderedSetIds = orderedSetIds.filter((id: any) => Number(id) !== Number(draggedSetId))
            
            // Insert it before the target set
            const targetIndex = orderedSetIds.indexOf(targetSetId)
            if (targetIndex !== -1) {
              orderedSetIds.splice(targetIndex, 0, draggedSetId)
            } else {
              orderedSetIds.push(draggedSetId)
            }
            
            onReorderSets(targetMachineId, orderedSetIds)
          }
        }
      } catch (err) {
        console.error(err)
      }
    }, [canCreate, onReallocateDie, onReorderSets, machinesWithData, setActiveDragType])

    const handleDropOnUnassigned = useCallback((e: React.DragEvent) => {
      e.preventDefault()
      setDragOverNode(null)
      setActiveDragType(null)
      if (!canCreate) return
      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'))
        if (data.type === 'die') {
          const { id: dieId } = data
          onReallocateDie(dieId, null)
        }
      } catch (err) {
        console.error(err)
      }
    }, [canCreate, onReallocateDie, setActiveDragType])

    return (
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0f0f0f] border-r border-[#1a1a1a] flex flex-col transform transition-transform duration-150 ease-in-out shrink-0 md:sticky md:top-0 md:h-[calc(100vh-48px)] md:transform-none md:z-auto font-mono select-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${
          isSidebarCollapsed ? 'md:hidden' : 'md:flex'
        }`}
      >
        {/* Sidebar Header with Tree Search */}
        <div className="p-3 border-b border-[#2a2a2a] bg-[#0a0a0a] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[#e4e4e4] text-xs tracking-wider uppercase">01 EXPLORER</span>
            {/* Close button for mobile */}
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1 bg-[#141414] border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] rounded-sm transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          
          {/* Tree Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#6b7280]" />
            <input 
              type="text"
              placeholder="SEARCH TREE..."
              value={treeSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTreeSearch(e.target.value)}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 pl-8 pr-2.5 text-xs text-[#e4e4e4] placeholder-[#404040] focus:outline-none transition-colors font-mono uppercase"
            />
          </div>

          {/* Toggle to show/hide empty nodes */}
          <div 
            className="flex items-center justify-between px-0.5 mt-0.5 text-[#6b7280] hover:text-[#e4e4e4] transition-colors select-none cursor-pointer" 
            onClick={() => setShowEmptyNodes(!showEmptyNodes)}
          >
            <span className="text-[9px] uppercase tracking-wider">SHOW EMPTY NODES</span>
            <div className={`relative w-7 h-3.5 rounded-sm transition-colors shrink-0 border border-[#2a2a2a] ${showEmptyNodes ? 'bg-blue-600' : 'bg-[#141414]'}`}>
              <div className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-none bg-white transition-transform ${showEmptyNodes ? 'translate-x-3.5' : 'translate-x-0'}`} />
            </div>
          </div>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 font-mono">
          <div>
            {/* Search Results Tree Node */}
            {isSearchActive && (
              <div className="mb-3">
                <div
                  onClick={() => setSelectedNode({ type: 'search' })}
                  className={`flex items-center w-full rounded-sm transition-colors select-none cursor-pointer py-1.5 px-2 border-l-2 font-mono ${
                    selectedNode?.type === 'search'
                      ? 'bg-[#141414] text-[#e4e4e4] border-l-blue-500'
                      : 'text-[#6b7280] hover:bg-[#141414] hover:text-[#e4e4e4] border-transparent'
                  }`}
                >
                  <Search className={`h-3.5 w-3.5 shrink-0 mr-2 ${selectedNode?.type === 'search' ? 'text-blue-400' : 'text-[#6b7280]'}`} />
                  <span className="text-xs font-medium truncate flex-1 uppercase">Search Results</span>
                  <span className="bg-[#0a0a0a] text-blue-400 text-[10px] px-1.5 py-0.2 rounded-sm border border-[#2a2a2a] shrink-0 font-mono tabular-nums">
                    {dies?.length || 0}
                  </span>
                </div>
              </div>
            )}

            <div className="px-2 py-1 text-[10px] font-medium text-[#6b7280] uppercase tracking-widest flex items-center gap-1.5">
              <Database className="h-3 w-3 text-blue-500" />
              <span>MACHINES & SETS</span>
            </div>
            
            <div className="space-y-0.5 mt-1">
              {filteredMachines.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-[#6b7280] italic">No matches found</div>
              ) : (
                filteredMachines.map((machine: any) => {
                  const isMachineExpanded = treeSearch ? true : !!expandedMachines[machine.id]
                  const isMachineSelected = selectedNode?.type === 'machine' && selectedNode?.id === machine.id
                  const isMachineDragOver = dragOverNode?.type === 'machine' && dragOverNode?.id === machine.id
                  
                  return (
                    <div key={machine.id} className="space-y-0.5">
                      {/* Machine Node */}
                      <div 
                        data-testid={`machine-node-${machine.id}`}
                        className={`group flex items-center w-full rounded-sm transition-colors select-none border-l-2 py-1 px-1.5 font-mono ${
                          isMachineDragOver
                            ? 'bg-[#141414] text-[#e4e4e4] border-l-blue-500'
                            : isMachineSelected 
                              ? 'bg-[#141414] text-[#e4e4e4] border-l-blue-500' 
                              : 'text-[#6b7280] hover:bg-[#141414] hover:text-[#e4e4e4] border-transparent cursor-pointer'
                        }`}
                        onClick={() => setSelectedNode({ type: 'machine', id: machine.id })}
                        onDragOver={canCreate ? (e: React.DragEvent<HTMLDivElement>) => { if (activeDragType === 'set') e.preventDefault(); } : undefined}
                        onDragEnter={canCreate ? (e: React.DragEvent<HTMLDivElement>) => { if (activeDragType === 'set') setDragOverNode({ type: 'machine', id: machine.id }); } : undefined}
                        onDragLeave={canCreate ? () => setDragOverNode(null) : undefined}
                        onDrop={canCreate ? (e: React.DragEvent<HTMLDivElement>) => handleDropOnMachine(e, machine.id) : undefined}
                      >
                        <button
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation()
                            toggleMachine(machine.id)
                          }}
                          className="p-0.5 rounded transition mr-1"
                        >
                          {isMachineExpanded ? (
                            <ChevronDown className="h-3 w-3 text-[#6b7280]" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-[#6b7280]" />
                          )}
                        </button>
                        <Cpu className={`h-3.5 w-3.5 shrink-0 mr-1.5 ${isMachineSelected ? 'text-blue-400' : 'text-[#6b7280]'}`} />
                        <span className="text-xs font-medium truncate flex-1 uppercase">{machine.name}</span>
                        <span className="bg-[#0a0a0a] text-[#6b7280] text-[9px] px-1.5 py-0.2 rounded-sm border border-[#2a2a2a] shrink-0 tabular-nums">
                          {machine.totalDies}
                        </span>
                      </div>
                      
                      {/* Set Nodes (Children) */}
                      {isMachineExpanded && (
                        <div className="relative pl-3 space-y-0.5 ml-3 mt-0.5">
                          <div className="tree-branch-line" />
                          {machine.sets.map((set: any) => {
                            const isSetSelected = selectedNode?.type === 'set' && selectedNode?.id === set.id
                            const isSetDragOver = dragOverNode?.type === 'set' && dragOverNode?.id === set.id
                            return (
                              <div key={set.id} className="relative pl-4">
                                <div className="tree-leaf-line" />
                                <div
                                  data-testid={`set-node-${set.id}`}
                                  onClick={() => setSelectedNode({ type: 'set', id: set.id, machineId: machine.id })}
                                  draggable={canCreate}
                                  onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                                    if (canCreate) {
                                      e.dataTransfer.effectAllowed = 'move';
                                      e.dataTransfer.setData('application/json', JSON.stringify({ type: 'set', id: set.id, currentMachineId: machine.id }));
                                      setActiveDragType('set');
                                    }
                                  }}
                                  onDragEnd={() => {
                                    setActiveDragType(null);
                                    setDragOverNode(null);
                                  }}
                                  onDragOver={canCreate ? (e: React.DragEvent<HTMLDivElement>) => { if (activeDragType === 'die' || activeDragType === 'set') e.preventDefault(); } : undefined}
                                  onDragEnter={canCreate ? (e: React.DragEvent<HTMLDivElement>) => { if (activeDragType === 'die' || activeDragType === 'set') setDragOverNode({ type: 'set', id: set.id }); } : undefined}
                                  onDragLeave={canCreate ? () => setDragOverNode(null) : undefined}
                                  onDrop={canCreate ? (e: React.DragEvent<HTMLDivElement>) => handleDropOnSet(e, set.id, machine.id) : undefined}
                                  className={`flex items-center w-full rounded-sm transition-colors select-none py-1 px-1.5 border-l-2 font-mono ${
                                    canCreate ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                                  } ${
                                    isSetDragOver
                                      ? 'bg-[#141414] text-[#e4e4e4] border-l-purple-500'
                                      : isSetSelected
                                        ? 'bg-[#141414] text-[#e4e4e4] border-l-purple-500'
                                        : 'text-[#6b7280] hover:bg-[#141414] hover:text-[#e4e4e4] border-transparent'
                                  }`}
                                >
                                  <Layers className={`h-3 w-3 shrink-0 mr-1.5 ${isSetSelected ? 'text-purple-400' : 'text-[#6b7280]'}`} />
                                  <span className="text-xs font-normal truncate flex-1 uppercase">{set.name}</span>
                                  <span className="flex items-center gap-1 text-[#e4e4e4] text-[9px] px-1 py-0.2 rounded-sm bg-[#0a0a0a] border border-[#2a2a2a] shrink-0 tabular-nums">
                                    {set.die_count > 0 && (
                                      <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                                    )}
                                    {set.die_count}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Unassigned Dies Node */}
            {unassignedCount > 0 && (
              <div className="pt-3 border-t border-[#1a1a1a] mt-3">
                {(() => {
                  const isUnassignedDragOver = dragOverNode?.type === 'unassigned'
                  return (
                    <div
                      onClick={() => setSelectedNode({ type: 'unassigned' })}
                      onDragOver={canCreate ? (e: React.DragEvent<HTMLDivElement>) => { if (activeDragType === 'die') e.preventDefault(); } : undefined}
                      onDragEnter={canCreate ? (e: React.DragEvent<HTMLDivElement>) => { if (activeDragType === 'die') setDragOverNode({ type: 'unassigned' }); } : undefined}
                      onDragLeave={canCreate ? () => setDragOverNode(null) : undefined}
                      onDrop={canCreate ? (e: React.DragEvent<HTMLDivElement>) => handleDropOnUnassigned(e) : undefined}
                      className={`flex items-center w-full rounded-sm transition-colors select-none cursor-pointer py-1.5 px-2 border-l-2 font-mono ${
                        isUnassignedDragOver
                          ? 'bg-[#141414] text-[#e4e4e4] border-l-amber-500'
                          : selectedNode?.type === 'unassigned'
                            ? 'bg-[#141414] text-[#e4e4e4] border-l-amber-500'
                            : 'text-[#6b7280] hover:bg-[#141414] hover:text-[#e4e4e4] border-transparent'
                      }`}
                    >
                      <Sliders className={`h-3.5 w-3.5 shrink-0 mr-2 ${selectedNode?.type === 'unassigned' ? 'text-amber-400' : 'text-[#6b7280]'}`} />
                      <span className="text-xs font-medium truncate flex-1 uppercase">Unassigned Dies</span>
                      <span className="bg-[#0a0a0a] text-amber-400 text-[10px] px-1.5 py-0.2 rounded-sm border border-[#2a2a2a] shrink-0 tabular-nums">
                        {unassignedCount}
                      </span>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
)

MachineSidebarTree.displayName = 'MachineSidebarTree'
