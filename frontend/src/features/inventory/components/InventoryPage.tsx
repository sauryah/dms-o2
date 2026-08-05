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
        className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition focus-ring"
      >
        <ChevronDown className="h-3.5 w-3.5" />
        Expand Tree
      </button>
      <button
        type="button"
        onClick={handleCollapseAll}
        className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition focus-ring"
      >
        <ChevronUp className="h-3.5 w-3.5" />
        Collapse Tree
      </button>
      <ExportMenu options={exportOptions} />
      {canCreate && (
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition cursor-pointer focus-ring"
        >
          <Plus className="h-4 w-4" />
          <span>Add Die</span>
        </button>
      )}
    </>
  )

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] relative bg-slate-950 text-white font-sans">
      
      {/* Sidebar Overlay (Mobile only) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm md:hidden transition-opacity duration-300 animate-fadeIn"
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
      <div className="flex-1 min-w-0 bg-slate-950 flex flex-col">
        
        {/* Toggle Sidebar Button for Header Bar */}
        <div className="border-b border-slate-900 bg-slate-950 p-4 flex md:hidden items-center justify-between z-20">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold text-xs font-mono uppercase tracking-wider">Die Registry Navigation</span>
        </div>

        <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-6 overflow-y-auto">
          
          {/* Header Block */}
          <PageHeader 
            title="Die Registry Inventory" 
            breadcrumbs={breadcrumbs} 
            actions={headerActions}
          />

          {/* Search Inputs */}
          <div className="flex flex-col sm:flex-row gap-3 items-center w-full">
            <div className="flex-1 w-full">
              <SearchBar 
                ref={searchInputRef}
                value={q}
                onChange={setQ}
                onClear={() => setQ('')}
                loading={isLoading}
                placeholder="Search dies by ID, casing, location, set, or machine..."
              />
            </div>
            <button 
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-6 py-3.5 rounded-2xl border text-sm font-bold transition w-full sm:w-auto shrink-0 justify-center cursor-pointer ${
                showFilters 
                  ? 'bg-blue-600/10 text-blue-400 border-blue-500/30' 
                  : 'bg-slate-950/40 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filters</span>
            </button>
          </div>

          {/* Active Chips Row */}
          {activeFiltersList.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 select-none">
              {activeFiltersList.map((chip) => (
                <FilterChip 
                  key={chip.key} 
                  label={chip.label} 
                  onRemove={chip.onRemove} 
                />
              ))}
              <button
                onClick={clearAllFilters}
                className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400 hover:text-blue-300 transition shrink-0 ml-1 py-1.5"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Search Content Split Sidebar-Results */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            
            {/* Collapsible Left Filter Sidebar */}
            {showFilters && (
              <div className="w-full lg:w-60 shrink-0">
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
            <div className="flex-1 w-full min-w-0 space-y-4">
              
              {/* Secondary view controls bar */}
              <div className="flex items-center justify-between select-none">
                <div className="flex items-center space-x-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 font-mono">
                  <Compass className="h-4 w-4 text-blue-500" />
                  <span>
                    {isLoading ? 'Scanning Registry...' : `${totalCount} ${totalCount === 1 ? 'die' : 'dies'} registered`}
                  </span>
                </div>

                {/* Grid / List / Warehouse view toggles */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-900">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center space-x-1 ${
                      viewMode === 'grid' 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Grid View (Cards)"
                  >
                    <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                    <span>Grid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center space-x-1 ${
                      viewMode === 'list' 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="List View (Table)"
                  >
                    <Table2 className="h-3.5 w-3.5 shrink-0" />
                    <span>List</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('rack' as any)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center space-x-1 ${
                      viewMode === ('rack' as any) 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Warehouse Rack Placement Grid"
                  >
                    <Map className="h-3.5 w-3.5 shrink-0" />
                    <span>Racks</span>
                  </button>
                </div>
              </div>

              {/* View Rendering Selector */}
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton width="w-full" height="h-20" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} width="w-full" height="h-48" />
                    ))}
                  </div>
                </div>
              ) : error ? (
                <div className="text-center py-12 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8 max-w-xl mx-auto shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-2">Query Failure</h3>
                  <p className="font-mono text-sm">{error.message}</p>
                </div>
              ) : !selectedNode ? (
                <div className="text-center py-20 bg-slate-900/30 border border-slate-800/80 rounded-2xl p-8 max-w-md mx-auto shadow-xl select-none">
                  <h3 className="text-lg font-semibold text-white mb-1">No Selection</h3>
                  <p className="text-slate-400 text-sm">Select a machine, set, or registry node from the left tree navigation sidebar.</p>
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 border border-slate-800/80 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl flex flex-wrap items-center gap-6 max-w-4xl animate-slideUp font-sans select-none">
          <div className="flex items-center space-x-2.5">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-200 tracking-wider">
              {selectedDieIds.size} {selectedDieIds.size === 1 ? 'item' : 'items'} selected
            </span>
          </div>

          <div className="h-5 w-[1px] bg-slate-800" />

          <div className="flex flex-wrap items-center gap-4">
            {/* Status update group */}
            <div className="flex items-center space-x-2">
              <select
                value={bulkStatus}
                disabled={isUpdating}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
              >
                <option value="">— Select Status —</option>
                <option value="AVAILABLE">Available</option>
                <option value="RUNNING">Running</option>
                <option value="CLEANING">Cleaning</option>
                <option value="POLISHING">Polishing</option>
                <option value="DAMAGED">Damaged</option>
                <option value="SCRAPPED">Scrapped</option>
                <option value="MISSING">Missing</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>

              <button
                onClick={handleBulkStatusUpdate}
                disabled={!bulkStatus || isUpdating}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isUpdating ? 'Updating...' : 'Apply Status'}
              </button>
            </div>

            <div className="h-5 w-[1px] bg-slate-800" />

            {/* Location update group */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={bulkLocation}
                disabled={isUpdating}
                onChange={(e) => setBulkLocation(e.target.value)}
                placeholder="e.g. Rack A - Shelf 3"
                className="bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none w-44 font-semibold"
              />

              <button
                onClick={handleBulkLocationUpdate}
                disabled={!bulkLocation.trim() || isUpdating}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isUpdating ? 'Updating...' : 'Apply Location'}
              </button>
            </div>

            <div className="h-5 w-[1px] bg-slate-800" />

            <button
              onClick={() => { setSelectedDieIds(new Set()); setBulkStatus(''); setBulkLocation(''); }}
              disabled={isUpdating}
              className="text-xs text-slate-400 hover:text-white px-3.5 py-2 rounded-xl border border-slate-800 hover:border-slate-700 transition cursor-pointer"
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
