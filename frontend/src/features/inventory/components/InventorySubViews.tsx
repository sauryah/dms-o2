import React from 'react'
import { Search, Database, Cpu, Layers, Activity, Sliders, ChevronRight } from 'lucide-react'
import { isDieActive } from '../../../utils/dieHelpers'
import { RackLayoutGrid } from './RackLayoutGrid'
import { DieStats } from '../../dashboard/components/DieStats'
import { DataTable, Column } from '../../../components/ui/DataTable'
import { DieCard } from '../../../components/ui/DieCard'
import { StatusBadge } from '../../../components/ui/StatusBadge'

interface ViewProps {
  viewMode: 'list' | 'grid' | 'rack'
  activeDiesList: any[]
  canCreate: boolean
  navigate: any
  moveDieLocationMutation: any
  handleDragStartDie?: (id: string) => void
  handleDragEndDie?: () => void
}

// Helper to define table columns for reusability
const getInventoryColumns = (navigate: any): Column[] => [
  {
    key: 'die_type',
    label: 'Type',
    render: (row: any) => (
      <span className="px-2.5 py-0.5 text-[9px] font-extrabold rounded bg-slate-800 text-slate-300 border border-slate-700/50 font-mono tracking-wider">
        {row.die_type}
      </span>
    )
  },
  {
    key: 'current_size',
    label: 'Size/Dimensions',
    sortable: true,
    render: (row: any) => {
      const isRound = row.die_type === 'ROUND'
      return (
        <span className="font-mono font-bold text-slate-200">
          {isRound ? (
            `Ø ${parseFloat(row.current_size || 0).toFixed(3)} mm`
          ) : (
            `${parseFloat(row.current_width || 0).toFixed(3)} × ${parseFloat(row.current_thickness || 0).toFixed(3)} mm`
          )}
        </span>
      )
    }
  },
  {
    key: 'die_id',
    label: 'ID',
    sortable: true,
    render: (row: any) => <span className="font-mono text-white font-bold">{row.die_id}</span>
  },
  {
    key: 'casing',
    label: 'Casing',
    render: (row: any) => <span className="font-mono text-slate-400">{row.casing || '—'}</span>
  },
  {
    key: 'location',
    label: 'Location',
    render: (row: any) => {
      const loc = row.rack_name && row.shelf ? `${row.rack_name} - S${row.shelf}` : row.location || '—'
      return <span className="text-slate-300 font-semibold">{loc}</span>
    }
  },
  {
    key: 'set_name',
    label: 'Set',
    render: (row: any) => <span className="text-slate-350">{row.set_name || '—'}</span>
  },
  {
    key: 'machine_name',
    label: 'Machine',
    render: (row: any) => <span className="text-slate-350">{row.machine_name || '—'}</span>
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    render: (row: any) => <StatusBadge status={row.status} />
  },
  {
    key: 'actions',
    label: 'Actions',
    render: (row: any) => (
      <button
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/dies/${row.die_id}`)
        }}
        className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-350 hover:text-white px-3 py-1 rounded-xl text-[11px] font-bold transition focus-ring cursor-pointer"
      >
        Details
      </button>
    )
  }
]

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
  const columns = getInventoryColumns(navigate)

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
            <div className="flex items-center justify-between select-none">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" />
                <span>
                  {viewMode === 'grid' ? 'Filtered Grid' : viewMode === 'list' ? 'Filtered Catalog' : 'Location Rack Placement'}
                </span>
              </h3>
              <span className="text-sm font-semibold text-slate-400">
                Showing {dies.length} of {totalCount} {totalCount === 1 ? 'result' : 'results'}
              </span>
            </div>

            {/* View Mode Router */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fadeIn">
                {dies.map(die => (
                  <DieCard 
                    key={die.die_id} 
                    die={die} 
                    onClick={() => navigate(`/dies/${die.die_id}`)} 
                  />
                ))}
              </div>
            ) : viewMode === 'list' ? (
              <div className="animate-fadeIn">
                <DataTable 
                  columns={columns} 
                  rows={dies} 
                  onRowClick={(row) => navigate(`/dies/${row.die_id}`)}
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
              </div>
            ) : (
              <RackLayoutGrid 
                dies={activeDiesList} 
                onMoveDie={(dieId, rackId, shelf) => moveDieLocationMutation.mutate({ dieId, rack: rackId, shelf })} 
                canMove={canCreate} 
                navigate={navigate}
              />
            )}

            {totalCount > pageSize && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-800/40 pt-6 gap-4 select-none">
                <div className="text-xs text-slate-400">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} entries
                </div>
                <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-900 shadow-inner">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-40 transition cursor-pointer"
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
                          className={`w-8 h-8 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                            page === pageNum
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    }
                    if (pageNum === 2 || pageNum === Math.ceil(totalCount / pageSize) - 1) {
                      return <span key={pageNum} className="text-slate-650 text-xs px-1 select-none">...</span>
                    }
                    return null
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                    disabled={page === Math.ceil(totalCount / pageSize)}
                    className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-40 transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-12 bg-slate-900/30 border border-slate-800/80 rounded-2xl max-w-md mx-auto shadow-xl select-none">
          <Database className="h-12 w-12 text-slate-600 mb-4 animate-pulse" />
          <h3 className="text-lg font-bold text-white mb-1">No Matching Dies</h3>
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed">No dies in the facility match your active search terms or filters. Try adjusting your inputs.</p>
        </div>
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
  const columns = getInventoryColumns(navigate)
  const machineDies = selectedMachine?.sets.reduce((acc: any[], s: any) => [...acc, ...s.dies], []) || []

  return (
    <div className="space-y-8">
      {selectedMachine ? (
        <>
          <div className="border-b border-slate-800/40 pb-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <Cpu className="h-4 w-4 text-blue-500" />
              <span>Machine Explorer</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">{selectedMachine.name}</h2>
            <span className="inline-block px-2.5 py-1 text-xs font-semibold bg-slate-905 border border-slate-800 text-slate-300 rounded-lg mt-2">
              {selectedMachine.category_name || 'Standard Category'}
            </span>
          </div>

          <DieStats 
            totalSets={selectedMachine.sets.length}
            totalDies={selectedMachine.totalDies}
            dies={machineDies}
          />

          <div className="pt-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2 select-none">
              <Layers className="h-4 w-4 text-indigo-400" />
              <span>
                {viewMode === 'grid' ? 'Assigned Sets Grid' : viewMode === 'list' ? 'Assigned Sets Table' : 'Location Rack Placement'}
              </span>
            </h3>

            {viewMode === 'grid' ? (
              selectedMachine.sets.length === 0 ? (
                <div className="glass-panel rounded-2xl p-8 text-center text-slate-400 italic border border-slate-800/40">
                  No sets found for this machine.
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
                        className="glass-panel hover:bg-slate-900/40 border border-slate-800/40 hover:border-indigo-500/40 rounded-2xl p-5 cursor-pointer transition-all duration-200 shadow-md group relative overflow-hidden select-none"
                      >
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
              )
            ) : viewMode === 'list' ? (
              <div className="animate-fadeIn">
                <DataTable 
                  columns={columns} 
                  rows={machineDies} 
                  onRowClick={(row) => navigate(`/dies/${row.die_id}`)}
                />
              </div>
            ) : (
              <RackLayoutGrid 
                dies={activeDiesList} 
                onMoveDie={(dieId, rackId, shelf) => moveDieLocationMutation.mutate({ dieId, rack: rackId, shelf })} 
                canMove={canCreate} 
                navigate={navigate}
              />
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="border-b border-slate-800/40 pb-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <Cpu className="h-4 w-4 text-blue-500" />
              <span>Machine Explorer</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">{rawMachine?.name || 'Machine'}</h2>
          </div>
          <div className="flex flex-col items-center justify-center text-center p-12 bg-slate-900/30 border border-slate-800/80 rounded-2xl max-w-md mx-auto shadow-xl select-none">
            <Cpu className="h-12 w-12 text-slate-650 mb-4 animate-pulse" />
            <p className="text-slate-400 font-medium">No dies assigned to this machine match the filters.</p>
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
  const columns = getInventoryColumns(navigate)
  const setDies = selectedSetData?.set.dies || []

  return (
    <div className="space-y-8">
      {selectedSetData ? (
        <>
          <div className="border-b border-slate-800/40 pb-5 select-none">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <span>{selectedSetData.machine?.name}</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-indigo-400">{selectedSetData.set.name}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">{selectedSetData.set.name}</h2>
            <p className="text-slate-400 text-xs mt-1">Assigned to machine: {selectedSetData.machine?.name}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none">
            <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Dies</span>
              <span className="text-2xl md:text-3xl font-black text-white mt-2 font-heading">{setDies.length}</span>
            </div>
            <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-emerald">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-bold">Active Dies</span>
              <span className="text-2xl md:text-3xl font-black text-emerald-400 mt-2 font-heading">
                {setDies.filter(isDieActive).length}
              </span>
            </div>
            <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-rose">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-bold">Inactive Dies</span>
              <span className="text-2xl md:text-3xl font-black text-rose-455 mt-2 font-heading">
                {setDies.length - setDies.filter(isDieActive).length}
              </span>
            </div>
          </div>

          {(() => {
            const total = setDies.length
            const active = setDies.filter(isDieActive).length
            const inactive = total - active
            const activePct = total > 0 ? ((active / total) * 100).toFixed(1) : '0.0'
            const inactivePct = total > 0 ? ((inactive / total) * 100).toFixed(1) : '0.0'
            return (
              <div className="glass-panel rounded-2xl p-6 shadow-xl border border-slate-800/40 relative overflow-hidden blueprint-grid select-none">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <span>Operational Ratio</span>
                </h3>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-emerald-400">Active: {active} ({activePct}%)</span>
                  <span className="text-rose-400">Inactive: {inactive} ({inactivePct}%)</span>
                </div>
                <div className="w-full bg-slate-950/80 h-3.5 rounded-full overflow-hidden flex border border-slate-855 p-0.5">
                  <div className="bg-gradient-to-r from-emerald-600 to-emerald-450 h-full rounded-full transition-all duration-550 shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ width: `${activePct}%` }} />
                  <div className="bg-gradient-to-r from-rose-600 to-rose-450 h-full rounded-full transition-all duration-550 shadow-[0_0_10px_rgba(239,68,68,0.3)]" style={{ width: `${inactivePct}%`, marginLeft: 'auto' }} />
                </div>
              </div>
            )
          })()}

          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2 select-none">
              <Layers className="h-4 w-4 text-indigo-400" />
              <span>
                {viewMode === 'grid' ? 'Assigned Grid' : viewMode === 'list' ? 'Assigned Catalog' : 'Location Rack Placement'}
              </span>
            </h3>
            
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fadeIn">
                {setDies.map(die => (
                  <DieCard 
                    key={die.die_id} 
                    die={die} 
                    onClick={() => navigate(`/dies/${die.die_id}`)} 
                  />
                ))}
              </div>
            ) : viewMode === 'list' ? (
              <div className="animate-fadeIn">
                <DataTable 
                  columns={columns} 
                  rows={setDies} 
                  onRowClick={(row) => navigate(`/dies/${row.die_id}`)}
                />
              </div>
            ) : (
              <RackLayoutGrid 
                dies={activeDiesList} 
                onMoveDie={(dieId, rackId, shelf) => moveDieLocationMutation.mutate({ dieId, rack: rackId, shelf })} 
                canMove={canCreate} 
                navigate={navigate}
              />
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="border-b border-slate-800/40 pb-5 select-none">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <span>{rawSetData?.machine?.name || 'Machine'}</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-indigo-400">{rawSetData?.set?.name || 'Set'}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">{rawSetData?.set?.name || 'Set'}</h2>
          </div>
          <div className="flex flex-col items-center justify-center text-center p-12 bg-slate-900/30 border border-slate-800/80 rounded-2xl max-w-md mx-auto shadow-xl select-none">
            <Layers className="h-12 w-12 text-slate-650 mb-4 animate-pulse" />
            <p className="text-slate-400 font-medium">No dies assigned to this set match the filters.</p>
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
  const columns = getInventoryColumns(navigate)

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="border-b border-slate-800/40 pb-5 select-none">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          <Sliders className="h-4 w-4 text-amber-500" />
          <span>Standalone Inventory</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white">Unassigned / Standalone Dies</h2>
        <p className="text-slate-400 text-xs mt-1">Production dies that are currently unassigned to any machine set.</p>
      </div>

      {unassignedDies && unassignedDies.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl select-none">
            <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-amber">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-bold relative z-10">Total Standalone</span>
              <span className="text-2xl md:text-3xl font-black text-amber-400 mt-2 relative z-10 font-heading">{totalCount}</span>
            </div>
            <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-emerald">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-bold relative z-10">Active</span>
              <span className="text-2xl md:text-3xl font-black text-emerald-400 mt-2 relative z-10 font-heading">
                {unassignedDies.filter(isDieActive).length}
              </span>
            </div>
            <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-rose">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-bold relative z-10">Inactive</span>
              <span className="text-2xl md:text-3xl font-black text-rose-455 mt-2 relative z-10 font-heading">
                {totalCount - unassignedDies.filter(isDieActive).length}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between select-none">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="h-4 w-4 text-amber-450" />
                <span>
                  {viewMode === 'grid' ? 'Standalone Grid' : viewMode === 'list' ? 'Standalone Catalog' : 'Location Rack Placement'}
                </span>
              </h3>
              <span className="text-sm font-semibold text-slate-400">
                Showing {unassignedDies.length} of {totalCount} {totalCount === 1 ? 'result' : 'results'}
              </span>
            </div>

            {/* View Mode Router */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fadeIn">
                {unassignedDies.map(die => (
                  <DieCard 
                    key={die.die_id} 
                    die={die} 
                    onClick={() => navigate(`/dies/${die.die_id}`)} 
                  />
                ))}
              </div>
            ) : viewMode === 'list' ? (
              <div className="animate-fadeIn">
                <DataTable 
                  columns={columns} 
                  rows={unassignedDies} 
                  onRowClick={(row) => navigate(`/dies/${row.die_id}`)}
                />
              </div>
            ) : (
              <RackLayoutGrid 
                dies={activeDiesList} 
                onMoveDie={(dieId, rackId, shelf) => moveDieLocationMutation.mutate({ dieId, rack: rackId, shelf })} 
                canMove={canCreate} 
                navigate={navigate}
              />
            )}
            
            {totalCount > pageSize && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-800/40 pt-6 gap-4 select-none">
                <div className="text-xs text-slate-400">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} entries
                </div>
                <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-900 shadow-inner">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-40 transition cursor-pointer"
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
                          className={`w-8 h-8 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                            page === pageNum
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    }
                    if (pageNum === 2 || pageNum === Math.ceil(totalCount / pageSize) - 1) {
                      return <span key={pageNum} className="text-slate-650 text-xs px-1 select-none">...</span>
                    }
                    return null
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                    disabled={page === Math.ceil(totalCount / pageSize)}
                    className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-40 transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-12 bg-slate-900/30 border border-slate-800/80 rounded-2xl max-w-md mx-auto shadow-xl select-none">
          <Sliders className="h-12 w-12 text-slate-605 mb-4 animate-pulse" />
          <p className="text-slate-400 font-medium">No unassigned dies match the current filters.</p>
        </div>
      )}
    </div>
  )
}
