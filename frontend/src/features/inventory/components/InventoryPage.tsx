import { useEffect, useRef, useMemo, useState } from 'react'
import { 
  Plus, 
  ChevronDown,
  ChevronUp,
  Menu, 
  SlidersHorizontal,
  Table2,
  LayoutGrid,
  Map,
  Compass
} from 'lucide-react'
import { MachineSidebarTree } from './MachineSidebarTree'
import { CreateDieModal } from './CreateDieModal'
import { FilterPanel } from './FilterPanel'
import { PageHeader } from '../../../components/ui/PageHeader'
import { SearchBar } from '../../../components/ui/SearchBar'
import { FilterChip } from '../../../components/ui/FilterChip'
import { ExportMenu } from '../../../components/ui/ExportMenu'
import { Skeleton } from '../../../components/ui/Skeleton'
import { useInventoryState } from '../hooks/useInventoryState'
import { SearchView, MachineView, SetView, UnassignedView } from './InventorySubViews'
import { useApi } from '../../../hooks/useApi'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../../contexts/ToastContext'

export function InventoryPage() {
  const {
    q,
    setQ,
    dieType,
    setDieType,
    statusVal,
    setStatusVal,
    casing,
    setCasing,
    sizeMin,
    setSizeMin,
    sizeMax,
    setSizeMax,
    widthMin,
    setWidthMin,
    widthMax,
    setWidthMax,
    thickMin,
    setThickMin,
    thickMax,
    setThickMax,
    locationQuery,
    setLocationQuery,
    showFilters,
    setShowFilters,
    isCreateOpen,
    setIsCreateOpen,
    sortField,
    sortOrder,
    handleSort,
    setsList,
    createError,
    isLoading,
    error,
    dies,
    totalCount,
    activeDragType,
    setActiveDragType,
    handleDragStartDie,
    handleDragEndDie,
    handleCreateSubmit,
    selectedNode,
    setSelectedNode,
    isSidebarCollapsed,
    isSidebarOpen,
    setIsSidebarOpen,
    isSearchActive,
    unassignedCount,
    machinesWithData,
    activeView,
    selectedMachine,
    selectedSetData,
    rawMachine,
    rawSetData,
    activeDiesList,
    canCreate,
    sidebarRef,
    handleExpandAll,
    handleCollapseAll,
    handleExportCSV,
    viewMode,
    setViewMode,
    navigate,
    createDieMutation,
    moveDieLocationMutation,
    reallocateDieMutation,
    reallocateSetMutation,
    reorderSetsMutation,
    page,
    setPage,
    pageSize
  } = useInventoryState()

  const { request } = useApi()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const [selectedDieIds, setSelectedDieIds] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkLocation, setBulkLocation] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const handleSelectId = (id: string, checked: boolean) => {
    setSelectedDieIds(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const currentViewDies = useMemo(() => {
    if (activeView === 'search') return dies || []
    if (activeView === 'machine') {
      return selectedMachine?.sets.reduce((acc: any[], s: any) => [...acc, ...s.dies], []) || []
    }
    if (activeView === 'set') return selectedSetData?.set.dies || []
    if (activeView === 'unassigned') return activeDiesList || []
    return []
  }, [activeView, dies, selectedMachine, selectedSetData, activeDiesList])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const ids = currentViewDies.map((d: any) => String(d.die_id))
      setSelectedDieIds(new Set(ids))
    } else {
      setSelectedDieIds(new Set())
    }
  }

  // Clear selections on search/filter/activeView changes
  useEffect(() => {
    setSelectedDieIds(new Set())
    setBulkStatus('')
    setBulkLocation('')
  }, [activeView, q, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, locationQuery])

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus) return
    setIsUpdating(true)
    try {
      for (const dieId of selectedDieIds) {
        await request(`/api/dies/${dieId}/`, {
          method: 'PATCH',
          body: JSON.stringify({ status: bulkStatus })
        })
      }
      const count = selectedDieIds.size
      setSelectedDieIds(new Set())
      setBulkStatus('')
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['searchDies'] })
      queryClient.invalidateQueries({ queryKey: ['machinesList'] })
      queryClient.invalidateQueries({ queryKey: ['setsDropdownList'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
      showToast(`Successfully updated status of ${count} dies to "${bulkStatus}".`, "success")
    } catch (err: any) {
      console.error(err)
      showToast(`Error updating status: ${err.message}`, "error")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBulkLocationUpdate = async () => {
    if (!bulkLocation.trim()) return
    setIsUpdating(true)
    try {
      for (const dieId of selectedDieIds) {
        await request(`/api/dies/${dieId}/`, {
          method: 'PATCH',
          body: JSON.stringify({ location: bulkLocation.trim() })
        })
      }
      const count = selectedDieIds.size
      setSelectedDieIds(new Set())
      setBulkLocation('')
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['searchDies'] })
      queryClient.invalidateQueries({ queryKey: ['machinesList'] })
      queryClient.invalidateQueries({ queryKey: ['setsDropdownList'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
      showToast(`Successfully updated location of ${count} dies to "${bulkLocation}".`, "success")
    } catch (err: any) {
      console.error(err)
      showToast(`Error updating locations: ${err.message}`, "error")
    } finally {
      setIsUpdating(false)
    }
  }

  const searchInputRef = useRef<HTMLInputElement>(null)

  // Global keydown listener for "/" to focus search bar
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return
      }

      if (e.key === '/') {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // Map active filters to chips
  const activeFiltersList = useMemo(() => {
    const list: { key: string; label: string; onRemove: () => void }[] = []
    
    if (dieType) {
      list.push({
        key: 'die_type',
        label: `Type: ${dieType}`,
        onRemove: () => setDieType('')
      })
    }
    if (statusVal) {
      list.push({
        key: 'status',
        label: `Status: ${statusVal}`,
        onRemove: () => setStatusVal('')
      })
    }
    if (casing) {
      list.push({
        key: 'casing',
        label: `Casing: ${casing}`,
        onRemove: () => setCasing('')
      })
    }
    if (sizeMin || sizeMax) {
      list.push({
        key: 'size_range',
        label: `Size: ${sizeMin || '0'} to ${sizeMax || '∞'} mm`,
        onRemove: () => { setSizeMin(''); setSizeMax(''); }
      })
    }
    if (widthMin || widthMax) {
      list.push({
        key: 'width_range',
        label: `Width: ${widthMin || '0'} to ${widthMax || '∞'} mm`,
        onRemove: () => { setWidthMin(''); setWidthMax(''); }
      })
    }
    if (thickMin || thickMax) {
      list.push({
        key: 'thick_range',
        label: `Thickness: ${thickMin || '0'} to ${thickMax || '∞'} mm`,
        onRemove: () => { setThickMin(''); setThickMax(''); }
      })
    }
    if (locationQuery) {
      list.push({
        key: 'location',
        label: `Loc: ${locationQuery}`,
        onRemove: () => setLocationQuery('')
      })
    }
    
    return list
  }, [dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, locationQuery, setDieType, setStatusVal, setCasing, setSizeMin, setSizeMax, setWidthMin, setWidthMax, setThickMin, setThickMax, setLocationQuery])

  const clearAllFilters = () => {
    setQ('')
    setDieType('')
    setStatusVal('')
    setCasing('')
    setSizeMin('')
    setSizeMax('')
    setWidthMin('')
    setWidthMax('')
    setThickMin('')
    setThickMax('')
    setLocationQuery('')
  }

  // Export menu configuration
  const exportOptions = useMemo(() => {
    const opts = [
      { label: 'Export All (CSV)', onSelect: handleExportCSV }
    ]
    if (activeView === 'machine' && selectedMachine) {
      opts.push({ 
        label: `Export ${selectedMachine.name} (CSV)`, 
        onSelect: handleExportCSV 
      })
    }
    if (activeView === 'set' && selectedSetData) {
      opts.push({ 
        label: `Export ${selectedSetData.set.name} (CSV)`, 
        onSelect: handleExportCSV 
      })
    }
    return opts
  }, [activeView, selectedMachine, selectedSetData, handleExportCSV])

  const breadcrumbs = [
    { label: 'Dashboard', href: '/' },
    { label: 'Die Registry Inventory' }
  ]

  const headerActions = (
    <>
      <button
        type="button"
        onClick={handleExpandAll}
        className="flex items-center gap-1.5 bg-[#141414] hover:bg-[#1f1f1f] text-[#e4e4e4] border border-[#2a2a2a] px-3 py-1.5 rounded-sm text-xs font-mono uppercase tracking-wider transition focus-ring cursor-pointer"
      >
        <ChevronDown className="h-3 w-3 text-[#6b7280]" />
        Expand Tree
      </button>
      <button
        type="button"
        onClick={handleCollapseAll}
        className="flex items-center gap-1.5 bg-[#141414] hover:bg-[#1f1f1f] text-[#e4e4e4] border border-[#2a2a2a] px-3 py-1.5 rounded-sm text-xs font-mono uppercase tracking-wider transition focus-ring cursor-pointer"
      >
        <ChevronUp className="h-3 w-3 text-[#6b7280]" />
        Collapse Tree
      </button>
      <ExportMenu options={exportOptions} />
      {canCreate && (
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center justify-center space-x-1.5 bg-[#141414] hover:bg-[#1f1f1f] text-blue-400 hover:text-blue-300 border border-blue-500/50 px-3.5 py-1.5 rounded-sm text-xs font-mono uppercase tracking-wider transition cursor-pointer focus-ring"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Die</span>
        </button>
      )}
    </>
  )

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-48px)] relative bg-[#0a0a0a] text-[#e4e4e4] font-mono">
      
      {/* Sidebar Overlay (Mobile only) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#0a0a0a]/80 md:hidden transition-opacity duration-150 animate-fadeIn"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* LEFT TREE SIDEBAR */}
      <MachineSidebarTree 
        ref={sidebarRef}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        selectedNode={selectedNode}
        setSelectedNode={setSelectedNode}
        machinesWithData={machinesWithData}
        dies={dies}
        unassignedCount={unassignedCount}
        isSearchActive={isSearchActive}
        canCreate={canCreate}
        activeDragType={activeDragType}
        setActiveDragType={setActiveDragType}
        onReallocateDie={(dieId, setId) => reallocateDieMutation.mutate({ dieId, setId })}
        onReallocateSet={(setId, machineId) => reallocateSetMutation.mutate({ setId, machineId })}
        onReorderSets={(machineId, orderedSetIds) => reorderSetsMutation.mutate({ machineId, orderedSetIds })}
      />

      {/* RIGHT CONTENT WORKSPACE */}
      <div className="flex-1 min-w-0 bg-[#0a0a0a] flex flex-col font-mono">
        
        {/* Toggle Sidebar Button for Mobile */}
        <div className="border-b border-[#2a2a2a] bg-[#0a0a0a] p-3 flex md:hidden items-center justify-between z-20">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 bg-[#141414] border border-[#2a2a2a] rounded-sm text-[#6b7280] hover:text-[#e4e4e4] transition"
          >
            <Menu className="h-4 w-4" />
          </button>
          <span className="font-medium text-xs uppercase tracking-wider">01 REGISTRY TREE</span>
        </div>

        <div className="flex-1 p-3 sm:p-5 lg:p-6 w-full max-w-7xl mx-auto space-y-4 overflow-y-auto">
          
          {/* Header Block */}
          <PageHeader 
            title="Die Registry Inventory" 
            breadcrumbs={breadcrumbs} 
            actions={headerActions}
          />

          {/* Search Inputs */}
          <div className="flex flex-col sm:flex-row gap-2 items-center w-full">
            <div className="flex-1 w-full">
              <SearchBar 
                ref={searchInputRef}
                value={q}
                onChange={setQ}
                onClear={() => setQ('')}
                loading={isLoading}
                placeholder="SEARCH DIES BY ID, CASING, LOCATION, SET, MACHINE..."
              />
            </div>
            <button 
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-sm border text-xs font-mono uppercase tracking-wider transition w-full sm:w-auto shrink-0 justify-center cursor-pointer ${
                showFilters 
                  ? 'bg-[#141414] text-blue-400 border-blue-500/50' 
                  : 'bg-[#141414] text-[#6b7280] hover:text-[#e4e4e4] border-[#2a2a2a]'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters</span>
            </button>
          </div>

          {/* Active Chips Row */}
          {activeFiltersList.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 select-none font-mono">
              {activeFiltersList.map((chip) => (
                <FilterChip 
                  key={chip.key} 
                  label={chip.label} 
                  onRemove={chip.onRemove} 
                />
              ))}
              <button
                onClick={clearAllFilters}
                className="text-[10px] uppercase tracking-wider text-blue-400 hover:text-blue-300 transition shrink-0 ml-1 py-1 font-mono cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Search Content Split Sidebar-Results */}
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            
            {/* Collapsible Left Filter Sidebar */}
            {showFilters && (
              <div className="w-full lg:w-64 shrink-0">
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
                  locationQuery={locationQuery}
                  onDieTypeChange={setDieType}
                  onStatusChange={setStatusVal}
                  onCasingChange={setCasing}
                  onSizeMinChange={setSizeMin}
                  onSizeMaxChange={setSizeMax}
                  onWidthMinChange={setWidthMin}
                  onWidthMaxChange={setWidthMax}
                  onThickMinChange={setThickMin}
                  onThickMaxChange={setThickMax}
                  onLocationChange={setLocationQuery}
                />
              </div>
            )}

            {/* Results Area */}
            <div className="flex-1 w-full min-w-0 space-y-3">
              
              {/* Secondary view controls bar */}
              <div className="flex items-center justify-between select-none font-mono">
                <div className="flex items-center space-x-1.5 text-[10px] uppercase tracking-wider text-[#6b7280]">
                  <Compass className="h-3.5 w-3.5 text-blue-500" />
                  <span>
                    {isLoading ? 'SCANNING REGISTRY...' : `${totalCount} ${totalCount === 1 ? 'DIE' : 'DIES'} REGISTERED`}
                  </span>
                </div>

                {/* Grid / List / Warehouse view toggles */}
                <div className="flex items-center gap-1 bg-[#0f0f0f] p-0.5 rounded-sm border border-[#2a2a2a]">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`px-2.5 py-1 rounded-sm text-[10px] uppercase tracking-wider transition-colors flex items-center space-x-1 font-mono ${
                      viewMode === 'grid' 
                        ? 'bg-[#141414] text-blue-400 border border-blue-500/40' 
                        : 'text-[#6b7280] hover:text-[#e4e4e4]'
                    }`}
                    title="Grid View (Cards)"
                  >
                    <LayoutGrid className="h-3 w-3 shrink-0" />
                    <span>Grid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`px-2.5 py-1 rounded-sm text-[10px] uppercase tracking-wider transition-colors flex items-center space-x-1 font-mono ${
                      viewMode === 'list' 
                        ? 'bg-[#141414] text-blue-400 border border-blue-500/40' 
                        : 'text-[#6b7280] hover:text-[#e4e4e4]'
                    }`}
                    title="List View (Table)"
                  >
                    <Table2 className="h-3 w-3 shrink-0" />
                    <span>List</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('rack' as any)}
                    className={`px-2.5 py-1 rounded-sm text-[10px] uppercase tracking-wider transition-colors flex items-center space-x-1 font-mono ${
                      viewMode === ('rack' as any) 
                        ? 'bg-[#141414] text-blue-400 border border-blue-500/40' 
                        : 'text-[#6b7280] hover:text-[#e4e4e4]'
                    }`}
                    title="Warehouse Rack Placement Grid"
                  >
                    <Map className="h-3 w-3 shrink-0" />
                    <span>Racks</span>
                  </button>
                </div>
              </div>

              {/* View Rendering Selector */}
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton width="w-full" height="h-16" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} width="w-full" height="h-40" />
                    ))}
                  </div>
                </div>
              ) : error ? (
                <div className="text-center py-8 bg-[#0f0f0f] border border-red-500/30 rounded-sm p-6 max-w-xl mx-auto font-mono">
                  <h3 className="text-xs font-medium text-red-400 mb-1 uppercase">QUERY FAILURE</h3>
                  <p className="font-mono text-xs text-[#6b7280]">{error.message}</p>
                </div>
              ) : !selectedNode ? (
                <div className="text-center py-12 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-6 max-w-md mx-auto select-none font-mono">
                  <h3 className="text-xs font-medium text-[#e4e4e4] uppercase mb-1">NO SELECTION</h3>
                  <p className="text-[#6b7280] text-xs">Select a machine, set, or registry node from the left tree navigation sidebar.</p>
                </div>
              ) : (
                <div>
                  {activeView === 'search' && (
                    <SearchView
                      dies={dies}
                      totalCount={totalCount}
                      viewMode={viewMode}
                      activeDiesList={activeDiesList}
                      canCreate={canCreate}
                      navigate={navigate}
                      sortField={sortField}
                      sortOrder={sortOrder}
                      handleSort={handleSort}
                      handleDragStartDie={handleDragStartDie}
                      handleDragEndDie={handleDragEndDie}
                      moveDieLocationMutation={moveDieLocationMutation}
                      page={page}
                      setPage={setPage}
                      pageSize={pageSize}
                      selectedDieIds={selectedDieIds}
                      onSelectId={handleSelectId}
                      onSelectAll={handleSelectAll}
                    />
                  )}

                  {activeView === 'machine' && (
                    <MachineView
                      selectedMachine={selectedMachine}
                      rawMachine={rawMachine}
                      viewMode={viewMode}
                      activeDiesList={activeDiesList}
                      canCreate={canCreate}
                      navigate={navigate}
                      setSelectedNode={setSelectedNode}
                      moveDieLocationMutation={moveDieLocationMutation}
                      selectedDieIds={selectedDieIds}
                      onSelectId={handleSelectId}
                      onSelectAll={handleSelectAll}
                    />
                  )}

                  {activeView === 'set' && (
                    <SetView
                      selectedSetData={selectedSetData}
                      rawSetData={rawSetData}
                      viewMode={viewMode}
                      activeDiesList={activeDiesList}
                      canCreate={canCreate}
                      navigate={navigate}
                      handleDragStartDie={handleDragStartDie}
                      handleDragEndDie={handleDragEndDie}
                      moveDieLocationMutation={moveDieLocationMutation}
                      selectedDieIds={selectedDieIds}
                      onSelectId={handleSelectId}
                      onSelectAll={handleSelectAll}
                    />
                  )}

                  {activeView === 'unassigned' && (
                    <UnassignedView
                      unassignedDies={activeDiesList}
                      viewMode={viewMode}
                      activeDiesList={activeDiesList}
                      canCreate={canCreate}
                      navigate={navigate}
                      handleDragStartDie={handleDragStartDie}
                      handleDragEndDie={handleDragEndDie}
                      moveDieLocationMutation={moveDieLocationMutation}
                      totalCount={totalCount}
                      page={page}
                      setPage={setPage}
                      pageSize={pageSize}
                      selectedDieIds={selectedDieIds}
                      onSelectId={handleSelectId}
                      onSelectAll={handleSelectAll}
                    />
                  )}
                </div>
              )}

            </div>
          </div>

        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedDieIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[#0f0f0f] border border-[#2a2a2a] px-4 py-2.5 rounded-sm flex flex-wrap items-center gap-4 max-w-4xl animate-fadeIn font-mono select-none">
          <div className="flex items-center space-x-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-medium text-[#e4e4e4] uppercase tracking-wider">
              {selectedDieIds.size} {selectedDieIds.size === 1 ? 'ITEM' : 'ITEMS'} SELECTED
            </span>
          </div>

          <div className="h-4 w-[1px] bg-[#2a2a2a]" />

          <div className="flex flex-wrap items-center gap-3">
            {/* Status update group */}
            <div className="flex items-center space-x-1.5">
              <select
                value={bulkStatus}
                disabled={isUpdating}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm px-2 py-1 text-xs text-[#e4e4e4] focus:outline-none font-mono uppercase"
              >
                <option value="">— SELECT STATUS —</option>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="RUNNING">RUNNING</option>
                <option value="CLEANING">CLEANING</option>
                <option value="POLISHING">POLISHING</option>
                <option value="DAMAGED">DAMAGED</option>
                <option value="SCRAPPED">SCRAPPED</option>
                <option value="MISSING">MISSING</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>

              <button
                onClick={handleBulkStatusUpdate}
                disabled={!bulkStatus || isUpdating}
                className="bg-[#141414] hover:bg-[#1f1f1f] text-blue-400 border border-blue-500/50 text-xs uppercase px-3 py-1 rounded-sm transition disabled:opacity-40 cursor-pointer font-mono"
              >
                {isUpdating ? 'UPDATING...' : 'APPLY STATUS'}
              </button>
            </div>

            <div className="h-4 w-[1px] bg-[#2a2a2a]" />

            {/* Location update group */}
            <div className="flex items-center space-x-1.5">
              <input
                type="text"
                value={bulkLocation}
                disabled={isUpdating}
                onChange={(e) => setBulkLocation(e.target.value)}
                placeholder="e.g. Rack A - Shelf 3"
                className="bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm px-2 py-1 text-xs text-[#e4e4e4] placeholder-[#404040] focus:outline-none w-40 font-mono"
              />

              <button
                onClick={handleBulkLocationUpdate}
                disabled={!bulkLocation.trim() || isUpdating}
                className="bg-[#141414] hover:bg-[#1f1f1f] text-blue-400 border border-blue-500/50 text-xs uppercase px-3 py-1 rounded-sm transition disabled:opacity-40 cursor-pointer font-mono"
              >
                {isUpdating ? 'UPDATING...' : 'APPLY LOCATION'}
              </button>
            </div>

            <div className="h-4 w-[1px] bg-[#2a2a2a]" />

            <button
              onClick={() => { setSelectedDieIds(new Set()); setBulkStatus(''); setBulkLocation(''); }}
              disabled={isUpdating}
              className="text-xs font-mono uppercase text-[#6b7280] hover:text-[#e4e4e4] px-2.5 py-1 rounded-sm border border-[#2a2a2a] bg-[#141414] hover:bg-[#1f1f1f] transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Die Modal Wizard */}
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
