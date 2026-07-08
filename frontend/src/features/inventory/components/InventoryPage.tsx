import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Search, 
  SlidersHorizontal, 
  Plus, 
  ChevronRight, 
  ChevronLeft, 
  Menu, 
  Cpu, 
  Layers, 
  Database, 
  Sliders,
  Activity
} from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { useAnnouncer } from '../../../contexts/AccessibilityContext'
import { useApi } from '../../../hooks/useApi'
import { useDebounce } from '../../../hooks/useDebounce'
import { isDieActive } from '../../../utils/dieHelpers'
import { DiesTable } from './DiesTable'
import { CreateDieModal } from './CreateDieModal'
import { FilterPanel } from './FilterPanel'
import { DieStats } from '../../dashboard/components/DieStats'
import { RackLayoutGrid } from './RackLayoutGrid'
import { Skeleton, TableSkeleton } from '../../../components/Skeleton'
import { EmptyState } from '../../../components/EmptyState'

// New imports:
import { MachineSidebarTree, MachineSidebarTreeRef } from './MachineSidebarTree'
import { useInventoryMutations } from '../hooks/useInventoryMutations'

export function InventoryPage() {
  const { request } = useApi()
  const { role } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  
  // Search parameters states initialized from URL if present
  const [q, setQ] = useState(searchParams.get('q') || '')
  const debouncedQ = useDebounce(q, 300)
  const [dieType, setDieType] = useState(searchParams.get('die_type') || '')
  const [statusVal, setStatusVal] = useState(searchParams.get('status') || '')
  const [casing, setCasing] = useState(searchParams.get('casing') || '')
  
  // Custom ranges
  const [sizeMin, setSizeMin] = useState(searchParams.get('size_min') || '')
  const [sizeMax, setSizeMax] = useState(searchParams.get('size_max') || '')
  const [widthMin, setWidthMin] = useState(searchParams.get('width_min') || '')
  const [widthMax, setWidthMax] = useState(searchParams.get('width_max') || '')
  const [thickMin, setThickMin] = useState(searchParams.get('thick_min') || '')
  const [thickMax, setThickMax] = useState(searchParams.get('thick_max') || '')
  
  const [showFilters, setShowFilters] = useState(!!(
    searchParams.get('die_type') || 
    searchParams.get('status') || 
    searchParams.get('casing') || 
    searchParams.get('size_min') || 
    searchParams.get('size_max') || 
    searchParams.get('width_min') || 
    searchParams.get('width_max') || 
    searchParams.get('thick_min') || 
    searchParams.get('thick_max')
  ))
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const hasActiveFilter = !!(debouncedQ || dieType || statusVal || casing || sizeMin || sizeMax || widthMin || widthMax || thickMin || thickMax)

  const [sortField, setSortField] = useState<string>('relevance')
  const [sortOrder, setSortOrder] = useState<string>('asc')

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // Fetch list of sets for the dropdown
  const { data: setsList } = useQuery({
    queryKey: ['setsDropdownList'],
    queryFn: () => request('/api/sets/')
  })

  // Fetch list of machines
  const { data: machinesList } = useQuery({
    queryKey: ['machinesList'],
    queryFn: () => request('/api/machines/')
  })

  const [createError, setCreateError] = useState<string | null>(null)

  // React Query Fetcher
  const { data: searchData, isLoading, error } = useQuery({
    queryKey: ['dies', debouncedQ, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, '10000'],
    queryFn: ({ signal }: { signal: AbortSignal }) => {
      let url = '/api/go/search'
      const params = new URLSearchParams()
      
      if (debouncedQ) params.append('q', debouncedQ)
      if (dieType) params.append('die_type', dieType)
      if (statusVal) params.append('status', statusVal)
      if (casing) params.append('casing', casing)
      
      if (sizeMin) params.append('size_min', sizeMin)
      if (sizeMax) params.append('size_max', sizeMax)
      if (widthMin) params.append('width_min', widthMin)
      if (widthMax) params.append('width_max', widthMax)
      if (thickMin) params.append('thick_min', thickMin)
      if (thickMax) params.append('thick_max', thickMax)
      params.append('limit', '10000')
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }
      return request(url, { signal, keepMetadata: true })
    }
  })

  const announce = useAnnouncer()

  useEffect(() => {
    if (searchData) {
      const count = searchData.results?.length ?? 0
      announce(`Search results updated. Showing ${count} matching dies.`)
    }
  }, [searchData])

  const rawDies = searchData?.results || []
  const sortedDies = useMemo(() => {
    if (sortField === 'relevance') {
      return rawDies
    }
    return [...rawDies].sort((a, b) => {
      let valA = a[sortField] || ''
      let valB = b[sortField] || ''
      
      if (sortField === 'category') {
        valA = a.die_type || ''
        valB = b.die_type || ''
      }
      
      if (sortField === 'current_size') {
        valA = a.die_type === 'ROUND' ? parseFloat(a.current_size || 0) : parseFloat(a.current_width || 0)
        valB = b.die_type === 'ROUND' ? parseFloat(b.current_size || 0) : parseFloat(b.current_width || 0)
      }
      
      if (typeof valA === 'string') {
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA)
      } else {
        return sortOrder === 'asc' ? valA - valB : valB - valA
      }
    })
  }, [rawDies, sortField, sortOrder])

  const dies = sortedDies
  const totalCount = searchData?.total ?? dies.length

  // Hook up custom mutations hook:
  const {
    createDieMutation,
    moveDieLocationMutation,
    reallocateDieMutation,
    reallocateSetMutation
  } = useInventoryMutations(setIsCreateOpen, setCreateError)

  const [activeDragType, setActiveDragType] = useState<string | null>(null) // shared drag state

  const handleDragStartDie = (id: string) => {
    setActiveDragType('die')
  }

  const handleDragEndDie = () => {
    setActiveDragType(null)
  }

  const handleCreateSubmit = (payload: any) => {
    setCreateError(null)
    createDieMutation.mutate(payload)
  }

  const [selectedNode, setSelectedNode] = useState<{ type: string; id?: any; machineId?: any } | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const isSearchActive = useMemo(() => {
    return !!(q || dieType || statusVal || casing || sizeMin || sizeMax || widthMin || widthMax || thickMin || thickMax)
  }, [q, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax])

  // Automatically select search node when search starts/ends
  useEffect(() => {
    if (isSearchActive) {
      setSelectedNode({ type: 'search' })
    } else {
      setSelectedNode(null)
    }
  }, [isSearchActive])

  // Group dies for selection fallback calculations
  const { unassignedDies, machinesWithData } = useMemo(() => {
    const diesBySet: Record<string | number, any[]> = {}
    const unassignedDies: any[] = []
    
    dies?.forEach((die: any) => {
      if (die.current_set) {
        if (!diesBySet[die.current_set]) {
          diesBySet[die.current_set] = []
        }
        diesBySet[die.current_set].push(die)
      } else {
        unassignedDies.push(die)
      }
    })

    const setsByMachine: Record<string | number, any[]> = {}
    setsList?.forEach((set: any) => {
      if (set.machine) {
        if (!setsByMachine[set.machine]) {
          setsByMachine[set.machine] = []
        }
        setsByMachine[set.machine].push(set)
      }
    })

    const machinesWithData = (machinesList || []).map((machine: any) => {
      const setsForMachine = setsByMachine[machine.id] || []
      const machineSets = setsForMachine.map((set: any) => {
        const setDies = diesBySet[set.id] || []
        return {
          ...set,
          dies: setDies
        }
      })

      return {
        ...machine,
        sets: machineSets,
        totalDies: machineSets.reduce((sum: number, s: any) => sum + s.dies.length, 0)
      }
    })

    return { unassignedDies, machinesWithData }
  }, [dies, machinesList, setsList])

  // Set default selected node once data is loaded and no search is active
  useEffect(() => {
    if (!selectedNode && !isSearchActive) {
      if (machinesWithData && machinesWithData.length > 0) {
        setSelectedNode({ type: 'machine', id: machinesWithData[0].id })
      } else if (unassignedDies && unassignedDies.length > 0) {
        setSelectedNode({ type: 'unassigned' })
      }
    }
  }, [machinesWithData, unassignedDies, selectedNode, isSearchActive])

  // Compute active view based on selection and search status
  const activeView = useMemo(() => {
    if (isSearchActive && (!selectedNode || selectedNode.type === 'search')) {
      return 'search'
    }
    if (selectedNode) {
      return selectedNode.type
    }
    return 'placeholder'
  }, [selectedNode, isSearchActive])

  // Find currently selected machine details from active data
  const selectedMachine = useMemo(() => {
    if (selectedNode?.type === 'machine') {
      return machinesWithData.find((m: any) => m.id === selectedNode.id)
    }
    return null
  }, [selectedNode, machinesWithData])

  // Find currently selected set details from active data
  const selectedSetData = useMemo(() => {
    if (selectedNode?.type === 'set') {
      for (const m of machinesWithData) {
        const s = m.sets.find((set: any) => set.id === selectedNode.id)
        if (s) {
          return { set: s, machine: m }
        }
      }
    }
    return null
  }, [selectedNode, machinesWithData])

  // Find raw machine and set to show empty fallback details if filtered out
  const rawMachine = useMemo(() => {
    if (selectedNode?.type === 'machine') {
      return (machinesList || []).find((m: any) => m.id === selectedNode.id)
    }
    return null
  }, [selectedNode, machinesList])

  const rawSetData = useMemo(() => {
    if (selectedNode?.type === 'set') {
      const s = (setsList || []).find((set: any) => set.id === selectedNode.id)
      if (s) {
        const m = (machinesList || []).find((mach: any) => mach.id === s.machine)
        return { set: s, machine: m }
      }
    }
    return null
  }, [selectedNode, setsList, machinesList])

  const activeDiesList = useMemo(() => {
    if (activeView === 'search') return dies || []
    if (activeView === 'machine') return selectedMachine?.sets.reduce((acc: any[], s: any) => [...acc, ...s.dies], []) || []
    if (activeView === 'set') return selectedSetData?.set.dies || []
    if (activeView === 'unassigned') return unassignedDies || []
    return []
  }, [activeView, dies, selectedMachine, selectedSetData, unassignedDies])

  const canCreate = role === 'ROOT' || role === 'ADMIN'

  // Ref to invoke expandAll / collapseAll on the tree
  const sidebarRef = useRef<MachineSidebarTreeRef>(null)

  const handleExpandAll = () => {
    sidebarRef.current?.expandAll()
  }

  const handleCollapseAll = () => {
    sidebarRef.current?.collapseAll()
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] relative bg-slate-950 text-white font-sans">
      
      {/* Sidebar Overlay (Mobile only) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* LEFT PANEL - Tree Navigation */}
      <MachineSidebarTree 
        ref={sidebarRef}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
        machinesList={machinesList}
        setsList={setsList}
        dies={dies}
        isSearchActive={isSearchActive}
        canCreate={canCreate}
        activeDragType={activeDragType}
        setActiveDragType={setActiveDragType}
        onReallocateDie={(dieId, setId) => reallocateDieMutation.mutate({ dieId, setId })}
        onReallocateSet={(setId, machineId) => reallocateSetMutation.mutate({ setId, machineId })}
      />

      {/* RIGHT PANEL - Content Area */}
      <div className="flex-1 min-w-0 bg-slate-950 flex flex-col">
        
        {/* Top Header & Navbar-like control */}
        <div className="glass-panel border-b border-slate-800/40 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
          <div className="flex items-center">
            {/* Sidebar toggle button (Mobile: Drawer, Desktop/Tablet: Collapse) */}
            <button 
              onClick={() => {
                if (window.innerWidth < 768) {
                  setIsSidebarOpen(!isSidebarOpen)
                } else {
                  setIsSidebarCollapsed(!isSidebarCollapsed)
                }
              }}
              className="p-2 bg-slate-955 border border-slate-800 hover:bg-slate-850 rounded-xl text-slate-400 hover:text-white transition shadow-sm mr-4"
              title="Toggle Sidebar"
            >
              {/* Mobile View: Hamburger Menu */}
              <span className="md:hidden">
                <Menu className="h-5 w-5" />
              </span>
              {/* Desktop View: Dynamic Chevrons */}
              <span className="hidden md:inline">
                {isSidebarCollapsed ? (
                  <ChevronRight className="h-5 w-5 text-blue-400" />
                ) : (
                  <ChevronLeft className="h-5 w-5" />
                )}
              </span>
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Die Registry Inventory</h1>
              <p className="text-slate-400 text-xs mt-0.5 hidden sm:block">Professional enterprise-grade inventory registry dashboard.</p>
            </div>
          </div>
        </div>

        {/* Inner Content Area */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-4 sm:space-y-6 lg:space-y-8 overflow-y-auto">
          
          {/* Action Bar (Search & Filter Section) */}
          <div className="glass-panel rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-800/40 blueprint-grid relative">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between relative z-10">
              <div className="relative flex-1 w-full">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 sm:left-4 h-4 sm:h-5 w-4 sm:w-5 text-slate-505" />
                  <input 
                    type="text" 
                    placeholder="Search dies..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="w-full glass-input rounded-xl py-2.5 sm:py-3 pl-10 sm:pl-12 pr-28 sm:pr-32 text-sm sm:text-base text-white placeholder-slate-550 focus:outline-none transition-all duration-350"
                  />
                  {hasActiveFilter && (
                    <span className="absolute right-3 bg-blue-500/10 border border-blue-500/25 text-blue-400 text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:py-1 rounded-lg select-none">
                      {isLoading ? '...' : `${totalCount} ${totalCount === 1 ? 'result' : 'results'}`}
                    </span>
                  )}
                </div>
                <p className="hidden sm:block text-slate-400 text-xs mt-1.5 ml-1">Search examples: 12345, ceramic, toolroom, polishing, machine-1</p>
              </div>
              
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center space-x-2 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl border font-bold transition-all duration-350 w-full sm:w-auto btn-glow glow-blue ${
                  showFilters 
                    ? 'bg-blue-600/15 text-blue-400 border-blue-500/30' 
                    : 'bg-slate-955/60 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <SlidersHorizontal className="h-4 sm:h-5 w-4 sm:w-5" />
                <span className="text-sm sm:text-base">Filters</span>
              </button>
            </div>

            {/* Secondary Actions Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-800/40 relative z-10">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExpandAll}
                  className="bg-slate-955/45 hover:bg-slate-850 text-slate-305 hover:text-white border border-slate-800 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition shadow-sm"
                >
                  Expand
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className="bg-slate-955/45 hover:bg-slate-850 text-slate-305 hover:text-white border border-slate-800 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold transition shadow-sm"
                >
                  Collapse
                </button>
              </div>

              {/* Sorting & View Toggle Container */}
              <div className="flex flex-wrap items-center gap-3 self-center sm:self-auto">
                {activeView === 'search' && (
                  <div className="flex items-center gap-1.5 bg-slate-955/80 border border-slate-800 px-3 py-1.5 rounded-xl shadow-inner text-xs font-semibold text-slate-400">
                    <span>Sort:</span>
                    <select
                      value={sortField === 'relevance' ? 'default' : `${sortField}_${sortOrder}`}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === 'default') {
                          setSortField('relevance')
                          setSortOrder('asc')
                        } else {
                          const [field, order] = val.split('_')
                          setSortField(field)
                          setSortOrder(order)
                        }
                      }}
                      className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="default" className="bg-slate-950 text-slate-300">Relevance</option>
                      <option value="current_size_asc" className="bg-slate-950 text-slate-300">Size: Small to Large</option>
                      <option value="current_size_desc" className="bg-slate-950 text-slate-300">Size: Large to Small</option>
                      {sortField !== 'relevance' && sortField !== 'current_size' && (
                        <option value={`${sortField}_${sortOrder}`} className="bg-slate-950 text-slate-300">
                          Sorted by {sortField === 'die_id' ? 'ID' : sortField} ({sortOrder === 'asc' ? 'Asc' : 'Desc'})
                        </option>
                      )}
                    </select>
                  </div>
                )}

                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-slate-955/80 border border-slate-800 p-1 rounded-xl shadow-inner">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-300 ${
                      viewMode === 'list' 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-455 hover:text-white'
                    }`}
                  >
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-300 ${
                      viewMode === 'grid' 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-455 hover:text-white'
                    }`}
                  >
                    Rack Grid
                  </button>
                </div>
              </div>

              {canCreate && (
                <button 
                  onClick={() => setIsCreateOpen(true)}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 sm:px-5 py-2.5 rounded-xl font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300 text-xs sm:text-sm btn-glow glow-blue"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Die</span>
                </button>
              )}
            </div>

            {showFilters && (
              <FilterPanel
                dieType={dieType}
                statusVal={statusVal}
                casing={casing}
                sizeMin={sizeMin}
                sizeMax={sizeMax}
                widthMin={widthMin}
                widthMax={widthMax}
                thickMin={thickMin}
                thickMax={thickMax}
                onDieTypeChange={setDieType}
                onStatusChange={setStatusVal}
                onCasingChange={setCasing}
                onSizeMinChange={setSizeMin}
                onSizeMaxChange={setSizeMax}
                onWidthMinChange={setWidthMin}
                onWidthMaxChange={setWidthMax}
                onThickMinChange={setThickMin}
                onThickMaxChange={setThickMax}
              />
            )}
          </div>

          {/* Master Detail View Wrapper */}
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-10 w-1/4" />
              <div className="flex gap-6">
                <div className="flex-1">
                  <TableSkeleton rows={4} cols={5} />
                </div>
                <Skeleton className="w-80 h-[400px] hidden lg:block" />
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8">
              <p className="text-rose-400 font-bold">Error loading inventory: {error.message}</p>
            </div>
          ) : !selectedNode ? (
            <div className="text-center py-24 glass-panel rounded-2xl p-8 shadow-md border border-slate-800/40">
              <p className="text-slate-400 text-lg">No selection. Select a machine or set from the navigation tree.</p>
            </div>
          ) : (
            <div>
              
              {/* SEARCH RESULTS VIEW */}
              {activeView === 'search' && (
                <div className="space-y-8 animate-fadeIn">
                  {/* Header */}
                  <div className="border-b border-slate-800/40 pb-5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      <Search className="h-4 w-4 text-blue-500" />
                      <span>Search & Filter Results</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-white">Matching Dies</h2>
                    <p className="text-slate-400 text-xs mt-1">Showing all dies matching active registry filters.</p>
                  </div>

                  {dies && dies.length > 0 ? (
                    <>
                      {/* Stat Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
                        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-blue">
                          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-bold relative z-10">Total Matches</span>
                          <span className="text-2xl md:text-3xl font-black text-blue-400 mt-2 relative z-10 font-heading">{totalCount}</span>
                        </div>
                        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-emerald">
                          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-bold relative z-10">Active</span>
                          <span className="text-2xl md:text-3xl font-black text-emerald-400 mt-2 relative z-10 font-heading">
                            {dies.filter(isDieActive).length}
                          </span>
                        </div>
                        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-rose">
                          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-bold relative z-10">Inactive</span>
                          <span className="text-2xl md:text-3xl font-black text-rose-455 mt-2 relative z-10 font-heading">
                            {totalCount - dies.filter(isDieActive).length}
                          </span>
                        </div>
                      </div>

                      {/* Dies Table */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Database className="h-4 w-4 text-blue-500" />
                            <span>{viewMode === 'grid' ? 'Location Rack Grid' : 'Filtered Catalog'}</span>
                          </h3>
                          <span className="text-sm font-semibold text-slate-400">
                            Showing {dies.length} of {totalCount} {totalCount === 1 ? 'result' : 'results'}
                          </span>
                        </div>
                        {viewMode === 'grid' ? (
                          <RackLayoutGrid 
                            dies={activeDiesList} 
                            onMoveDie={(dieId, rackId, shelf, location) => moveDieLocationMutation.mutate({ dieId, rack: rackId, shelf, location })} 
                            canMove={canCreate} 
                            navigate={navigate}
                          />
                        ) : (
                          <div className="glass-panel rounded-2xl p-6 border border-slate-800/40">
                            <DiesTable 
                              diesList={dies} 
                              navigate={navigate} 
                              onDragStartDie={handleDragStartDie}
                              onDragEndDie={handleDragEndDie}
                              sortField={sortField}
                              sortOrder={sortOrder}
                              onSort={handleSort}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <EmptyState
                      title="No Matching Dies Found"
                      description="No dies in the facility match your active search terms or filters. Try clearing your filters or entering a different query."
                    />
                  )}
                </div>
              )}

              {/* MACHINE DETAILS VIEW */}
              {activeView === 'machine' && (
                <div className="space-y-8">
                  {selectedMachine ? (
                    <>
                      {/* Header */}
                      <div className="border-b border-slate-800/40 pb-5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-505 uppercase tracking-wider mb-1">
                          <Cpu className="h-4 w-4 text-blue-500" />
                          <span>Machine Explorer</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white">{selectedMachine.name}</h2>
                        <span className="inline-block px-2.5 py-1 text-xs font-semibold glass-card border border-blue-500/20 text-blue-400 rounded-lg mt-2">
                          {selectedMachine.category_name || 'Standard Category'}
                        </span>
                      </div>

                      {/* Stat Cards */}
                      <DieStats 
                        totalSets={selectedMachine.sets.length}
                        totalDies={selectedMachine.totalDies}
                        dies={selectedMachine.sets.reduce((acc: any[], s: any) => [...acc, ...s.dies], [])}
                      />

                      {/* Sets Cards Section */}
                      <div className="pt-4">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Layers className="h-4 w-4 text-indigo-400" />
                          <span>{viewMode === 'grid' ? 'Location Rack Grid' : 'Assigned Sets'}</span>
                        </h3>
                        {viewMode === 'grid' ? (
                          <RackLayoutGrid 
                            dies={activeDiesList} 
                            onMoveDie={(dieId, rackId, shelf, location) => moveDieLocationMutation.mutate({ dieId, rack: rackId, shelf, location })} 
                            canMove={canCreate} 
                            navigate={navigate}
                          />
                        ) : selectedMachine.sets.length === 0 ? (
                          <div className="glass-panel rounded-2xl p-8 text-center text-slate-400 italic border border-slate-800/40">
                            No sets found for this machine matching filters.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {selectedMachine.sets.map((set: any) => {
                              const sTotal = set.dies.length
                              const sActive = set.dies.filter(isDieActive).length
                              const sInactive = sTotal - sActive
                              return (
                                <div
                                  key={set.id}
                                  onClick={() => setSelectedNode({ type: 'set', id: set.id, machineId: selectedMachine.id })}
                                  className="glass-panel hover:bg-slate-900/40 border border-slate-800/40 hover:border-indigo-500/40 rounded-2xl p-5 cursor-pointer hover:-translate-y-0.5 transition-all duration-300 shadow-md group relative overflow-hidden"
                                >
                                  {/* Hover Glow */}
                                  <div className="absolute inset-x-0 bottom-0 h-1 bg-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                                  
                                  <div className="flex items-center justify-between mb-4">
                                    <span className="font-extrabold text-white text-base group-hover:text-indigo-400 transition-colors">
                                      {set.name}
                                    </span>
                                    <span className="text-xs bg-slate-950 text-indigo-400 font-bold px-2.5 py-0.5 rounded-full border border-slate-800">
                                      {sTotal} {sTotal === 1 ? 'Die' : 'Dies'}
                                    </span>
                                  </div>
                                  <div className="flex gap-4 text-xs text-slate-400 border-t border-slate-800/40 pt-3">
                                    <div>
                                      <span className="text-emerald-400 font-bold">{sActive}</span> Active
                                    </div>
                                    <div>
                                      <span className="text-rose-400 font-bold">{sInactive}</span> Inactive
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    /* Fallback when selected machine is filtered out */
                    <div className="space-y-6">
                      <div className="border-b border-slate-800/40 pb-5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-550 uppercase tracking-wider mb-1">
                          <Cpu className="h-4 w-4 text-blue-500" />
                          <span>Machine Explorer</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white">{rawMachine?.name || 'Machine'}</h2>
                      </div>
                      <div className="glass-panel rounded-2xl p-12 text-center shadow-lg border border-slate-800/40 blueprint-grid relative">
                        <Cpu className="h-12 w-12 text-slate-600 mx-auto mb-4 animate-pulse" />
                        <p className="text-slate-400 font-medium">No dies assigned to this machine match the current filters.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SET DETAILS VIEW */}
              {activeView === 'set' && (
                <div className="space-y-8">
                  {selectedSetData ? (
                    <>
                      {/* Header */}
                      <div className="border-b border-slate-800/40 pb-5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          <span>{selectedSetData.machine?.name}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                          <span className="text-indigo-400">{selectedSetData.set.name}</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white">{selectedSetData.set.name}</h2>
                        <p className="text-slate-400 text-xs mt-1">Assigned to machine: {selectedSetData.machine?.name}</p>
                      </div>

                      {/* Stat Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid hover:border-indigo-500/20 transition-all duration-300">
                          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Dies</span>
                          <span className="text-2xl md:text-3xl font-black text-white mt-2 font-heading">{selectedSetData.set.dies.length}</span>
                        </div>
                        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-emerald hover:border-emerald-500/20 transition-all duration-300">
                          <span className="text-slate-455 text-xs font-semibold uppercase tracking-wider font-bold">Active Dies</span>
                          <span className="text-2xl md:text-3xl font-black text-emerald-400 mt-2 font-heading">
                            {selectedSetData.set.dies.filter(isDieActive).length}
                          </span>
                        </div>
                        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-rose hover:border-rose-500/20 transition-all duration-300">
                          <span className="text-slate-455 text-xs font-semibold uppercase tracking-wider font-bold">Inactive Dies</span>
                          <span className="text-2xl md:text-3xl font-black text-rose-455 mt-2 font-heading">
                            {selectedSetData.set.dies.length - selectedSetData.set.dies.filter(isDieActive).length}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      {(() => {
                        const total = selectedSetData.set.dies.length
                        const active = selectedSetData.set.dies.filter(isDieActive).length
                        const inactive = total - active
                        const activePct = total > 0 ? ((active / total) * 100).toFixed(1) : '0.0'
                        const inactivePct = total > 0 ? ((inactive / total) * 100).toFixed(1) : '0.0'
                        return (
                          <div className="glass-panel rounded-2xl p-6 shadow-xl border border-slate-800/40 relative overflow-hidden blueprint-grid">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                              <Activity className="h-4 w-4 text-emerald-400" />
                              <span>Operational Ratio</span>
                            </h3>
                            <div className="flex justify-between text-xs font-bold mb-2">
                              <span className="text-emerald-400">Active: {active} ({activePct}%)</span>
                              <span className="text-rose-400">Inactive: {inactive} ({inactivePct}%)</span>
                            </div>
                            <div className="w-full bg-slate-950/80 h-3.5 rounded-full overflow-hidden flex border border-slate-850 p-0.5">
                              <div className="bg-gradient-to-r from-emerald-600 to-emerald-450 h-full rounded-full transition-all duration-550 shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ width: `${activePct}%` }} />
                              <div className="bg-gradient-to-r from-rose-600 to-rose-450 h-full rounded-full transition-all duration-550 shadow-[0_0_10px_rgba(239,68,68,0.3)]" style={{ width: `${inactivePct}%`, marginLeft: 'auto' }} />
                            </div>
                          </div>
                        )
                      })()}

                      {/* Dies Table */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-semibold text-slate-505 uppercase tracking-wider flex items-center gap-2">
                          <Layers className="h-4 w-4 text-indigo-400" />
                          <span>{viewMode === 'grid' ? 'Location Rack Grid' : 'Dies Inventory'}</span>
                        </h3>
                        {viewMode === 'grid' ? (
                          <RackLayoutGrid 
                            dies={activeDiesList} 
                            onMoveDie={(dieId, rackId, shelf, location) => moveDieLocationMutation.mutate({ dieId, rack: rackId, shelf, location })} 
                            canMove={canCreate} 
                            navigate={navigate}
                          />
                        ) : (
                          <div className="glass-panel rounded-2xl p-6 border border-slate-800/40">
                            <DiesTable 
                              diesList={selectedSetData.set.dies} 
                              navigate={navigate} 
                              onDragStartDie={handleDragStartDie}
                              onDragEndDie={handleDragEndDie}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    /* Fallback when selected set is filtered out */
                    <div className="space-y-6">
                      <div className="border-b border-slate-800/40 pb-5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          <span>{rawSetData?.machine?.name || 'Machine'}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                          <span className="text-indigo-400">{rawSetData?.set?.name || 'Set'}</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white">{rawSetData?.set?.name || 'Set'}</h2>
                      </div>
                      <div className="glass-panel rounded-2xl p-12 text-center shadow-lg border border-slate-800/40 blueprint-grid relative">
                        <Layers className="h-12 w-12 text-slate-600 mx-auto mb-4 animate-pulse" />
                        <p className="text-slate-400 font-medium">No dies assigned to this set match the current filters.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* UNASSIGNED STANDALONE DIES VIEW */}
              {activeView === 'unassigned' && (
                <div className="space-y-8">
                  {/* Header */}
                  <div className="border-b border-slate-800/40 pb-5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-550 uppercase tracking-wider mb-1">
                      <Sliders className="h-4 w-4 text-amber-500" />
                      <span>Standalone Inventory</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-white">Unassigned / Standalone Dies</h2>
                    <p className="text-slate-400 text-xs mt-1">Production dies that are currently unassigned to any machine set.</p>
                  </div>

                  {unassignedDies.length > 0 ? (
                    <>
                      {/* Stat Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
                        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-amber hover:border-amber-500/20 transition-all duration-300">
                          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-bold relative z-10">Total Standalone</span>
                          <span className="text-2xl md:text-3xl font-black text-amber-400 mt-2 relative z-10 font-heading">{unassignedDies.length}</span>
                        </div>
                        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-emerald hover:border-emerald-500/20 transition-all duration-300">
                          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-bold relative z-10">Active</span>
                          <span className="text-2xl md:text-3xl font-black text-emerald-400 mt-2 relative z-10 font-heading">
                            {unassignedDies.filter(isDieActive).length}
                          </span>
                        </div>
                        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-rose hover:border-rose-500/20 transition-all duration-300">
                          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-bold relative z-10">Inactive</span>
                          <span className="text-2xl md:text-3xl font-black text-rose-455 mt-2 relative z-10 font-heading">
                            {unassignedDies.length - unassignedDies.filter(isDieActive).length}
                          </span>
                        </div>
                      </div>

                      {/* Dies Table */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-semibold text-slate-505 uppercase tracking-wider flex items-center gap-2">
                          <Sliders className="h-4 w-4 text-amber-450" />
                          <span>{viewMode === 'grid' ? 'Location Rack Grid' : 'Dies Inventory'}</span>
                        </h3>
                        {viewMode === 'grid' ? (
                          <RackLayoutGrid 
                            dies={activeDiesList} 
                            onMoveDie={(dieId, rackId, shelf, location) => moveDieLocationMutation.mutate({ dieId, rack: rackId, shelf, location })} 
                            canMove={canCreate} 
                            navigate={navigate}
                          />
                        ) : (
                          <div className="glass-panel rounded-2xl p-6 border border-slate-800/40">
                            <DiesTable 
                              diesList={unassignedDies} 
                              navigate={navigate} 
                              onDragStartDie={handleDragStartDie}
                              onDragEndDie={handleDragEndDie}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="glass-panel rounded-2xl p-12 text-center shadow-lg border border-slate-800/40 blueprint-grid relative">
                      <Sliders className="h-12 w-12 text-slate-600 mx-auto mb-4 animate-pulse" />
                      <p className="text-slate-400 font-medium">No unassigned dies match the current filters.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Die Modal */}
      <CreateDieModal 
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        isSubmitting={createDieMutation.isPending}
        error={createError}
        setsList={setsList || []}
      />
    </div>
  )
}
