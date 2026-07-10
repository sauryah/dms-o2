import React from 'react'
import { Search, Database, Cpu, Layers, Activity, Sliders, ChevronRight } from 'lucide-react'
import { isDieActive } from '../../../utils/dieHelpers'
import { DiesTable } from './DiesTable'
import { RackLayoutGrid } from './RackLayoutGrid'
import { DieStats } from '../../dashboard/components/DieStats'
import { EmptyState } from '../../../components/EmptyState'

interface ViewProps {
  viewMode: 'list' | 'grid'
  activeDiesList: any[]
  canCreate: boolean
  navigate: any
  moveDieLocationMutation: any
  handleDragStartDie?: (id: string) => void
  handleDragEndDie?: () => void
}

// 1. SEARCH RESULTS VIEW
interface SearchViewProps extends ViewProps {
  dies: any[]
  totalCount: number
  sortField: string
  sortOrder: string
  handleSort: (field: string) => void
  page: number
  setPage: React.Dispatch<React.SetStateAction<number>>
  pageSize: number
}

export function SearchView({
  dies,
  totalCount,
  viewMode,
  activeDiesList,
  canCreate,
  navigate,
  sortField,
  sortOrder,
  handleSort,
  handleDragStartDie,
  handleDragEndDie,
  moveDieLocationMutation,
  page,
  setPage,
  pageSize
}: SearchViewProps) {
  return (
    <div className="space-y-8 animate-fadeIn">
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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-505 uppercase tracking-wider flex items-center gap-2">
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
            {totalCount > pageSize && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-800/40 pt-6 gap-4">
                <div className="text-xs text-slate-400">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} entries
                </div>
                <div className="flex items-center space-x-2 bg-slate-955 p-1 rounded-xl border border-slate-800/40 shadow-inner">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-50 disabled:hover:text-slate-400 transition"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.ceil(totalCount / pageSize) }).map((_, i) => {
                    const pageNum = i + 1
                    if (pageNum === 1 || pageNum === Math.ceil(totalCount / pageSize) || Math.abs(pageNum - page) <= 1) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-xs font-extrabold transition ${
                            page === pageNum
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'border border-slate-800 bg-slate-900 text-slate-455 hover:text-white'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    }
                    if (pageNum === 2 || pageNum === Math.ceil(totalCount / pageSize) - 1) {
                      return <span key={pageNum} className="text-slate-600 text-xs px-1 select-none">...</span>
                    }
                    return null
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                    disabled={page === Math.ceil(totalCount / pageSize)}
                    className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-50 disabled:hover:text-slate-400 transition"
                  >
                    Next
                  </button>
                </div>
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
  )
}

// 2. MACHINE DETAILS VIEW
interface MachineViewProps extends ViewProps {
  selectedMachine: any
  rawMachine: any
  setSelectedNode: (node: any) => void
}

export function MachineView({
  selectedMachine,
  rawMachine,
  viewMode,
  activeDiesList,
  canCreate,
  navigate,
  setSelectedNode,
  moveDieLocationMutation
}: MachineViewProps) {
  return (
    <div className="space-y-8">
      {selectedMachine ? (
        <>
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

          <DieStats 
            totalSets={selectedMachine.sets.length}
            totalDies={selectedMachine.totalDies}
            dies={selectedMachine.sets.reduce((acc: any[], s: any) => [...acc, ...s.dies], [])}
          />

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
  )
}

// 3. SET DETAILS VIEW
interface SetViewProps extends ViewProps {
  selectedSetData: any
  rawSetData: any
}

export function SetView({
  selectedSetData,
  rawSetData,
  viewMode,
  activeDiesList,
  canCreate,
  navigate,
  handleDragStartDie,
  handleDragEndDie,
  moveDieLocationMutation
}: SetViewProps) {
  return (
    <div className="space-y-8">
      {selectedSetData ? (
        <>
          <div className="border-b border-slate-800/40 pb-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <span>{selectedSetData.machine?.name}</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-indigo-400">{selectedSetData.set.name}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">{selectedSetData.set.name}</h2>
            <p className="text-slate-400 text-xs mt-1">Assigned to machine: {selectedSetData.machine?.name}</p>
          </div>

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

          {(() => {
            const total = selectedSetData.set.dies.length
            const active = selectedSetData.set.dies.filter(isDieActive).length
            const inactive = total - active
            const activePct = total > 0 ? ((active / total) * 100).toFixed(1) : '0.0'
            const inactivePct = total > 0 ? ((inactive / total) * 100).toFixed(1) : '0.0'
            return (
              <div className="glass-panel rounded-2xl p-6 shadow-xl border border-slate-800/40 relative overflow-hidden blueprint-grid">
                <h3 className="text-xs font-semibold text-slate-405 uppercase tracking-wider mb-4 flex items-center gap-2">
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
  )
}

// 4. UNASSIGNED STANDALONE DIES VIEW
interface UnassignedViewProps extends ViewProps {
  unassignedDies: any[]
  totalCount: number
  page: number
  setPage: React.Dispatch<React.SetStateAction<number>>
  pageSize: number
}

export function UnassignedView({
  unassignedDies,
  viewMode,
  activeDiesList,
  canCreate,
  navigate,
  handleDragStartDie,
  handleDragEndDie,
  moveDieLocationMutation,
  totalCount,
  page,
  setPage,
  pageSize
}: UnassignedViewProps) {
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="border-b border-slate-800/40 pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-555 uppercase tracking-wider mb-1">
          <Sliders className="h-4 w-4 text-amber-500" />
          <span>Standalone Inventory</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white">Unassigned / Standalone Dies</h2>
        <p className="text-slate-400 text-xs mt-1">Production dies that are currently unassigned to any machine set.</p>
      </div>

      {unassignedDies && unassignedDies.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
            <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-amber hover:border-amber-500/20 transition-all duration-300">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-bold relative z-10">Total Standalone</span>
              <span className="text-2xl md:text-3xl font-black text-amber-400 mt-2 relative z-10 font-heading">{totalCount}</span>
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
                {totalCount - unassignedDies.filter(isDieActive).length}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-555 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="h-4 w-4 text-amber-450" />
                <span>{viewMode === 'grid' ? 'Location Rack Grid' : 'Dies Inventory'}</span>
              </h3>
              <span className="text-sm font-semibold text-slate-400">
                Showing {unassignedDies.length} of {totalCount} {totalCount === 1 ? 'result' : 'results'}
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
                  diesList={unassignedDies} 
                  navigate={navigate} 
                  onDragStartDie={handleDragStartDie}
                  onDragEndDie={handleDragEndDie}
                />
              </div>
            )}
            
            {totalCount > pageSize && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-800/40 pt-6 gap-4">
                <div className="text-xs text-slate-400">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} entries
                </div>
                <div className="flex items-center space-x-2 bg-slate-955 p-1 rounded-xl border border-slate-800/40 shadow-inner">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-50 disabled:hover:text-slate-400 transition"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.ceil(totalCount / pageSize) }).map((_, i) => {
                    const pageNum = i + 1
                    if (pageNum === 1 || pageNum === Math.ceil(totalCount / pageSize) || Math.abs(pageNum - page) <= 1) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-xs font-extrabold transition ${
                            page === pageNum
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'border border-slate-800 bg-slate-900 text-slate-455 hover:text-white'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    }
                    if (pageNum === 2 || pageNum === Math.ceil(totalCount / pageSize) - 1) {
                      return <span key={pageNum} className="text-slate-600 text-xs px-1 select-none">...</span>
                    }
                    return null
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                    disabled={page === Math.ceil(totalCount / pageSize)}
                    className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-50 disabled:hover:text-slate-400 transition"
                  >
                    Next
                  </button>
                </div>
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
  )
}
