import React from 'react'
import { 
  Search, 
  SlidersHorizontal, 
  Plus, 
  ChevronRight, 
  ChevronLeft, 
  Menu, 
  Download
} from 'lucide-react'
import { MachineSidebarTree } from './MachineSidebarTree'
import { CreateDieModal } from './CreateDieModal'
import { FilterPanel } from './FilterPanel'
import { Skeleton, TableSkeleton } from '../../../components/Skeleton'
import { useInventoryState } from '../hooks/useInventoryState'
import { SearchView, MachineView, SetView, UnassignedView } from './InventorySubViews'

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
    showFilters,
    setShowFilters,
    isCreateOpen,
    setIsCreateOpen,
    hasActiveFilter,
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
    setIsSidebarCollapsed,
    isSidebarOpen,
    setIsSidebarOpen,
    isSearchActive,
    unassignedDies,
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
    reallocateSetMutation
  } = useInventoryState()

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
        machinesList={machinesWithData}
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
                className={`flex items-center justify-center space-x-2 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl border font-bold transition-all duration-355 w-full sm:w-auto btn-glow glow-blue ${
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
                          handleSort('relevance')
                        } else {
                          const [field, order] = val.split('_')
                          handleSort(field)
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

                {/* Export CSV */}
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 bg-slate-955/80 border border-slate-800 hover:border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all duration-300 shadow-inner"
                  title="Export current list to CSV"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Export CSV</span>
                </button>

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
                />
              )}

              {activeView === 'unassigned' && (
                <UnassignedView
                  unassignedDies={unassignedDies}
                  viewMode={viewMode}
                  activeDiesList={activeDiesList}
                  canCreate={canCreate}
                  navigate={navigate}
                  handleDragStartDie={handleDragStartDie}
                  handleDragEndDie={handleDragEndDie}
                  moveDieLocationMutation={moveDieLocationMutation}
                />
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
