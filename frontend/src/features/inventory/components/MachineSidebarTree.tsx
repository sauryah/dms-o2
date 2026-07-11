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
    },
    ref
  ) => {
    // Local state for sidebar tree navigation
    const [treeSearch, setTreeSearch] = useState('')
    const [showEmptyNodes, setShowEmptyNodes] = useState(true)
    const [expandedMachines, setExpandedMachines] = useState<Record<string | number, boolean>>({})
    const [expandedSets, setExpandedSets] = useState<Record<string | number, boolean>>({})
    const [expandedUnassigned, setExpandedUnassigned] = useState(true)
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
        setExpandedUnassigned(true)
      },
      collapseAll() {
        setExpandedMachines({})
        setExpandedSets({})
        setExpandedUnassigned(false)
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

    const handleDropOnSet = useCallback((e: React.DragEvent, setId: any) => {
      e.preventDefault()
      setDragOverNode(null)
      setActiveDragType(null)
      if (!canCreate) return
      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'))
        if (data.type === 'die') {
          const { id: dieId } = data
          onReallocateDie(dieId, setId)
        }
      } catch (err) {
        console.error(err)
      }
    }, [canCreate, onReallocateDie, setActiveDragType])

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
        className={`fixed inset-y-0 left-0 z-50 w-72 glass-panel border-r border-slate-800/40 flex flex-col transform transition-transform duration-300 ease-in-out shrink-0 md:sticky md:top-0 md:h-[calc(100vh-64px)] md:transform-none md:z-auto ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${
          isSidebarCollapsed ? 'md:hidden' : 'md:flex'
        }`}
      >
        {/* Sidebar Header with Tree Search */}
        <div className="p-4 border-b border-slate-800/45 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 text-xs tracking-wider uppercase">Inventory Explorer</span>
            {/* Close button for mobile */}
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1.5 bg-slate-955 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          {/* Tree Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search machines or sets..."
              value={treeSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTreeSearch(e.target.value)}
              className="w-full glass-input rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none transition-all duration-200"
            />
          </div>

          {/* Toggle to show/hide empty nodes */}
          <div 
            className="flex items-center justify-between px-1 mt-1 text-slate-455 hover:text-slate-200 transition-colors select-none cursor-pointer" 
            onClick={() => setShowEmptyNodes(!showEmptyNodes)}
          >
            <span className="text-[10px] font-medium tracking-wider uppercase text-slate-400">Show empty machines & sets</span>
            <div className={`relative w-8 h-4 rounded-full transition-colors duration-200 shrink-0 ${showEmptyNodes ? 'bg-blue-600' : 'bg-slate-800'}`}>
              <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-200 ${showEmptyNodes ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </div>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            {/* Search Results Tree Node */}
            {isSearchActive && (
              <div className="mb-4">
                <div
                  onClick={() => setSelectedNode({ type: 'search' })}
                  className={`flex items-center w-full rounded-xl transition-all duration-200 select-none cursor-pointer py-2.5 pl-3 pr-3 border-l-4 ${
                    selectedNode?.type === 'search'
                      ? 'bg-blue-600/10 text-white border-blue-500 glow-blue'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-transparent'
                  }`}
                >
                  <Search className={`h-4 w-4 shrink-0 mr-2 ${selectedNode?.type === 'search' ? 'text-blue-400' : 'text-slate-505'}`} />
                  <span className="text-xs font-bold truncate flex-1">Search Results</span>
                  <span className="bg-slate-955 text-blue-400 text-xxs font-bold px-2 py-0.5 rounded-full border border-slate-800 shrink-0">
                    {dies?.length || 0}
                  </span>
                </div>
              </div>
            )}

            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-blue-500" />
              <span>Machines / Production Sets</span>
            </div>
            
            <div className="space-y-1 mt-2">
              {filteredMachines.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-505 italic">No matches found</div>
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
                        className={`group flex items-center w-full rounded-xl transition-all duration-200 select-none border-l-4 ${
                          isMachineDragOver
                            ? 'bg-blue-650 text-white border-blue-500 ring-2 ring-blue-500/20 pl-2 pr-3 py-2'
                            : isMachineSelected 
                              ? 'bg-blue-600/10 text-white border-blue-500 pl-2 pr-3 py-2 glow-blue' 
                              : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-transparent pl-2 pr-3 py-2 cursor-pointer'
                        }`}
                        onClick={() => setSelectedNode({ type: 'machine', id: machine.id })}
                        onDragOver={canCreate ? (e: React.DragEvent<HTMLDivElement>) => { if (activeDragType === 'set') e.preventDefault(); } : undefined}
                        onDragEnter={canCreate ? (e: React.DragEvent<HTMLDivElement>) => { if (activeDragType === 'set') setDragOverNode({ type: 'machine', id: machine.id }); } : undefined}
                        onDragLeave={canCreate ? (e: React.DragEvent<HTMLDivElement>) => setDragOverNode(null) : undefined}
                        onDrop={canCreate ? (e: React.DragEvent<HTMLDivElement>) => handleDropOnMachine(e, machine.id) : undefined}
                      >
                        <button
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation()
                            toggleMachine(machine.id)
                          }}
                          className="p-1 hover:bg-slate-855 rounded transition mr-1"
                        >
                          {isMachineExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                          )}
                        </button>
                        <Cpu className={`h-4 w-4 shrink-0 mr-2 ${isMachineSelected ? 'text-blue-400' : 'text-slate-505'}`} />
                        <span className="text-xs font-semibold truncate flex-1">{machine.name}</span>
                        <span className="bg-slate-950 text-slate-500 text-xxs px-2 py-0.5 rounded-full border border-slate-800 shrink-0 font-medium">
                          {machine.totalDies}
                        </span>
                      </div>
                      
                      {/* Set Nodes (Children) */}
                      {isMachineExpanded && (
                        <div className="relative pl-4 space-y-0.5 ml-4 mt-0.5">
                          <div className="tree-branch-line" />
                          {machine.sets.map((set: any) => {
                            const isSetSelected = selectedNode?.type === 'set' && selectedNode?.id === set.id
                            const activeCount = set.dies.filter(isDieActive).length
                            const isSetDragOver = dragOverNode?.type === 'set' && dragOverNode?.id === set.id
                            return (
                              <div key={set.id} className="relative pl-6">
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
                                  onDragOver={canCreate ? (e: React.DragEvent<HTMLDivElement>) => { if (activeDragType === 'die') e.preventDefault(); } : undefined}
                                  onDragEnter={canCreate ? (e: React.DragEvent<HTMLDivElement>) => { if (activeDragType === 'die') setDragOverNode({ type: 'set', id: set.id }); } : undefined}
                                  onDragLeave={canCreate ? () => setDragOverNode(null) : undefined}
                                  onDrop={canCreate ? (e: React.DragEvent<HTMLDivElement>) => handleDropOnSet(e, set.id) : undefined}
                                  className={`flex items-center w-full rounded-xl transition-all duration-200 select-none py-1.5 pl-3 pr-3 border-l-4 ${
                                    canCreate ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                                  } ${
                                    isSetDragOver
                                      ? 'bg-indigo-600/30 text-white border-indigo-500 ring-2 ring-indigo-500/20'
                                      : isSetSelected
                                        ? 'bg-indigo-600/10 text-white border-indigo-500 glow-indigo'
                                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-transparent'
                                  }`}
                                >
                                  <Layers className={`h-3.5 w-3.5 shrink-0 mr-2 ${isSetSelected ? 'text-indigo-400' : 'text-slate-505'}`} />
                                  <span className="text-xs font-medium truncate flex-1">{set.name}</span>
                                  <span className="flex items-center gap-1.5 text-indigo-400 text-xxs font-bold px-1.5 py-0.5 rounded-full bg-slate-955 border border-slate-800 shrink-0">
                                    {set.die_count > 0 && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dot-glow shrink-0 animate-pulse" />
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

            {/* Unassigned / Standalone Dies Node */}
            {unassignedCount > 0 && (
              <div className="pt-4 border-t border-slate-800/60 mt-4">
                {(() => {
                  const isUnassignedDragOver = dragOverNode?.type === 'unassigned'
                  return (
                    <div
                      onClick={() => setSelectedNode({ type: 'unassigned' })}
                      onDragOver={canCreate ? (e: React.DragEvent<HTMLDivElement>) => { if (activeDragType === 'die') e.preventDefault(); } : undefined}
                      onDragEnter={canCreate ? (e: React.DragEvent<HTMLDivElement>) => { if (activeDragType === 'die') setDragOverNode({ type: 'unassigned' }); } : undefined}
                      onDragLeave={canCreate ? () => setDragOverNode(null) : undefined}
                      onDrop={canCreate ? (e: React.DragEvent<HTMLDivElement>) => handleDropOnUnassigned(e) : undefined}
                      className={`flex items-center w-full rounded-xl transition-all duration-200 select-none cursor-pointer py-2.5 pl-3 pr-3 border-l-4 ${
                        isUnassignedDragOver
                          ? 'bg-amber-655 text-white border-amber-500 ring-2 ring-amber-500/20'
                          : selectedNode?.type === 'unassigned'
                            ? 'bg-amber-600/10 text-white border-amber-500 glow-amber'
                            : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-transparent'
                      }`}
                    >
                      <Sliders className={`h-4 w-4 shrink-0 mr-2 ${selectedNode?.type === 'unassigned' ? 'text-amber-400' : 'text-slate-505'}`} />
                      <span className="text-xs font-bold truncate flex-1">Unassigned Dies</span>
                      <span className="bg-slate-950 text-amber-400 text-xxs font-bold px-2 py-0.5 rounded-full border border-slate-800 shrink-0">
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
