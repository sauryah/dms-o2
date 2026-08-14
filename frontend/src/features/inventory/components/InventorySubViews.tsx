import React, { useState, useMemo, useEffect } from 'react'
import { Search, Database, Cpu, Layers, Activity, Sliders, ChevronRight, ArrowUpDown } from 'lucide-react'
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
  selectedDieIds?: Set<string>
  onSelectId?: (id: string, checked: boolean) => void
  onSelectAll?: (checked: boolean) => void
}

// Helper to define table columns for reusability
const getInventoryColumns = (navigate: any): Column[] => [
  {
    key: 'die_type',
    label: 'Type',
    render: (row: any) => (
      <span className="px-1.5 py-0.2 text-[9px] uppercase font-mono rounded-sm bg-[#141414] text-[#e4e4e4] border border-[#2a2a2a] tracking-wider">
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
        <span className="font-mono text-xs font-bold text-[#e4e4e4] tabular-nums">
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
    render: (row: any) => <span className="font-mono text-[#e4e4e4] font-bold">{row.die_id}</span>
  },
  {
    key: 'casing',
    label: 'Casing',
    render: (row: any) => <span className="font-mono text-[#6b7280]">{row.casing || '—'}</span>
  },
  {
    key: 'location',
    label: 'Location',
    render: (row: any) => {
      const loc = row.rack_name && row.shelf ? `${row.rack_name} - S${row.shelf}` : row.location || '—'
      return <span className="text-[#e4e4e4] font-mono">{loc}</span>
    }
  },
  {
    key: 'set_name',
    label: 'Set',
    render: (row: any) => <span className="text-[#6b7280] font-mono">{row.set_name || '—'}</span>
  },
  {
    key: 'machine_name',
    label: 'Machine',
    render: (row: any) => <span className="text-[#6b7280] font-mono">{row.machine_name || '—'}</span>
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
        className="bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] px-2.5 py-0.5 rounded-sm text-[10px] uppercase font-mono transition cursor-pointer"
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
  pageSize,
  selectedDieIds,
  onSelectId,
  onSelectAll
}: SearchViewProps) {
  const columns = getInventoryColumns(navigate)

  return (
    <div className="space-y-4 font-mono">
      <div className="border-b border-[#2a2a2a] pb-3">
        <div className="flex items-center gap-1.5 text-xs text-[#6b7280] uppercase tracking-wider mb-0.5">
          <Search className="h-3.5 w-3.5 text-blue-500" />
          <span>01 SEARCH & FILTER RESULTS</span>
        </div>
        <h2 className="text-sm md:text-base font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">Matching Dies</h2>
        <p className="text-[#6b7280] text-xs mt-0.5">Showing all dies matching active registry filters.</p>
      </div>

      {dies && dies.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl font-mono">
            <div className="bg-[#0f0f0f] rounded-sm p-3 border border-[#1a1a1a] flex flex-col justify-between">
              <span className="text-[#6b7280] text-[10px] uppercase tracking-wider">TOTAL MATCHES</span>
              <span className="text-xl font-bold font-mono text-blue-400 mt-1 tabular-nums">{totalCount}</span>
            </div>
            <div className="bg-[#0f0f0f] rounded-sm p-3 border border-[#1a1a1a] border-l-2 border-l-emerald-500 flex flex-col justify-between">
              <span className="text-[#6b7280] text-[10px] uppercase tracking-wider">ACTIVE</span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
                {dies.filter(isDieActive).length}
              </span>
            </div>
            <div className="bg-[#0f0f0f] rounded-sm p-3 border border-[#1a1a1a] border-l-2 border-l-red-500 flex flex-col justify-between">
              <span className="text-[#6b7280] text-[10px] uppercase tracking-wider">INACTIVE</span>
              <span className="text-xl font-bold font-mono text-red-400 mt-1 tabular-nums">
                {totalCount - dies.filter(isDieActive).length}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between select-none font-mono">
              <h3 className="text-xs font-medium text-[#6b7280] uppercase tracking-wider flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-blue-500" />
                <span>
                  {viewMode === 'grid' ? 'FILTERED GRID' : viewMode === 'list' ? 'FILTERED CATALOG' : 'LOCATION RACK PLACEMENT'}
                </span>
              </h3>
              <span className="text-xs text-[#6b7280] tabular-nums">
                SHOWING {dies.length} OF {totalCount} {totalCount === 1 ? 'RESULT' : 'RESULTS'}
              </span>
            </div>

            {/* View Mode Router */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-fadeIn">
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
                  selectedIds={selectedDieIds}
                  onSelectId={onSelectId}
                  onSelectAll={onSelectAll}
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
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[#1a1a1a] pt-4 gap-3 select-none font-mono">
                <div className="text-xs text-[#6b7280] tabular-nums">
                  SHOWING {(page - 1) * pageSize + 1} TO {Math.min(page * pageSize, totalCount)} OF {totalCount} ENTRIES
                </div>
                <div className="flex items-center space-x-1.5 bg-[#0f0f0f] p-1 rounded-sm border border-[#2a2a2a]">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1 rounded-sm border border-[#2a2a2a] bg-[#141414] text-xs font-mono uppercase text-[#6b7280] hover:text-[#e4e4e4] disabled:opacity-40 transition cursor-pointer"
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
                          className={`w-7 h-7 rounded-sm text-xs font-mono uppercase transition cursor-pointer ${
                            page === pageNum
                              ? 'bg-[#1f1f1f] text-blue-400 border border-blue-500/40'
                              : 'border border-[#2a2a2a] bg-[#141414] text-[#6b7280] hover:text-[#e4e4e4]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    }
                    if (pageNum === 2 || pageNum === Math.ceil(totalCount / pageSize) - 1) {
                      return <span key={pageNum} className="text-[#404040] text-xs px-1 select-none">...</span>
                    }
                    return null
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                    disabled={page === Math.ceil(totalCount / pageSize)}
                    className="px-2.5 py-1 rounded-sm border border-[#2a2a2a] bg-[#141414] text-xs font-mono uppercase text-[#6b7280] hover:text-[#e4e4e4] disabled:opacity-40 transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm max-w-md mx-auto select-none font-mono">
          <Database className="h-8 w-8 text-[#404040] mb-3" />
          <h3 className="text-xs font-medium uppercase text-[#e4e4e4] mb-1">NO MATCHING DIES</h3>
          <p className="text-[#6b7280] text-xs leading-normal">No dies in registry match active criteria. Adjust filters.</p>
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
  moveDieLocationMutation,
  selectedDieIds,
  onSelectId,
  onSelectAll
}: MachineViewProps) {
  const columns = getInventoryColumns(navigate)
  const machineDies = selectedMachine?.sets.reduce((acc: any[], s: any) => [...acc, ...s.dies], []) || []

  const [localPage, setLocalPage] = useState(1)
  const localPageSize = 25

  useEffect(() => {
    setLocalPage(1)
  }, [selectedMachine])

  const paginatedMachineDies = useMemo(() => {
    return machineDies.slice((localPage - 1) * localPageSize, localPage * localPageSize)
  }, [machineDies, localPage])

  return (
    <div className="space-y-4 font-mono">
      {selectedMachine ? (
        <>
          <div className="border-b border-[#2a2a2a] pb-3">
            <div className="flex items-center gap-1.5 text-xs text-[#6b7280] uppercase tracking-wider mb-0.5">
              <Cpu className="h-3.5 w-3.5 text-blue-500" />
              <span>01 MACHINE EXPLORER</span>
            </div>
            <h2 className="text-sm md:text-base font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">{selectedMachine.name}</h2>
            <span className="inline-block px-2 py-0.5 text-[10px] font-mono uppercase border border-[#2a2a2a] text-[#6b7280] bg-[#0f0f0f] rounded-sm mt-1.5">
              {selectedMachine.category_name || 'Standard Category'}
            </span>
          </div>

          <DieStats 
            totalSets={selectedMachine.sets.length}
            totalDies={selectedMachine.totalDies}
            dies={machineDies}
          />

          <div className="pt-2">
            <h3 className="text-xs font-medium text-[#6b7280] uppercase tracking-wider mb-3 flex items-center gap-1.5 select-none">
              <Layers className="h-3.5 w-3.5 text-purple-400" />
              <span>
                {viewMode === 'grid' ? '02 ASSIGNED SETS GRID' : viewMode === 'list' ? '02 ASSIGNED SETS TABLE' : '02 LOCATION RACK PLACEMENT'}
              </span>
            </h3>

            {viewMode === 'grid' ? (
              selectedMachine.sets.length === 0 ? (
                <div className="bg-[#0f0f0f] rounded-sm p-6 text-center text-[#6b7280] text-xs uppercase border border-[#1a1a1a]">
                  No sets found for this machine.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedMachine.sets.map((set: any) => {
                    const sTotal = set.dies.length
                    const sActive = set.dies.filter(isDieActive).length
                    const sInactive = sTotal - sActive
                    return (
                      <div
                        key={set.id}
                        onClick={() => setSelectedNode({ type: 'set', id: set.id, machineId: selectedMachine.id })}
                        className="bg-[#0f0f0f] hover:bg-[#141414] border border-[#1a1a1a] hover:border-[#2a2a2a] rounded-sm p-3.5 cursor-pointer transition-colors select-none font-mono"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-[#e4e4e4] text-xs uppercase truncate">
                            {set.name}
                          </span>
                          <span className="text-[10px] bg-[#0a0a0a] text-purple-400 px-1.5 py-0.2 rounded-sm border border-[#2a2a2a] tabular-nums">
                            {sTotal} {sTotal === 1 ? 'DIE' : 'DIES'}
                          </span>
                        </div>
                        <div className="flex gap-3 text-[10px] text-[#6b7280] border-t border-[#1a1a1a] pt-2 uppercase tabular-nums">
                          <div>
                            <span className="text-emerald-400 font-bold">{sActive}</span> ACTIVE
                          </div>
                          <div>
                            <span className="text-red-400 font-bold">{sInactive}</span> INACTIVE
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            ) : viewMode === 'list' ? (
              <div className="animate-fadeIn space-y-3">
                <DataTable 
                  columns={columns} 
                  rows={paginatedMachineDies} 
                  onRowClick={(row) => navigate(`/dies/${row.die_id}`)}
                  selectedIds={selectedDieIds}
                  onSelectId={onSelectId}
                  onSelectAll={onSelectAll}
                />
                
                {machineDies.length > localPageSize && (
                  <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[#1a1a1a] pt-4 gap-3 select-none font-mono">
                    <div className="text-xs text-[#6b7280] tabular-nums">
                      SHOWING {(localPage - 1) * localPageSize + 1} TO {Math.min(localPage * localPageSize, machineDies.length)} OF {machineDies.length} ENTRIES
                    </div>
                    <div className="flex items-center space-x-1.5 bg-[#0f0f0f] p-1 rounded-sm border border-[#2a2a2a]">
                      <button
                        onClick={() => setLocalPage(p => Math.max(1, p - 1))}
                        disabled={localPage === 1}
                        className="px-2.5 py-1 rounded-sm border border-[#2a2a2a] bg-[#141414] text-xs font-mono uppercase text-[#6b7280] hover:text-[#e4e4e4] disabled:opacity-40 transition cursor-pointer"
                      >
                        Previous
                      </button>
                      {Array.from({ length: Math.ceil(machineDies.length / localPageSize) }).map((_, i) => {
                        const pageNum = i + 1
                        if (pageNum === 1 || pageNum === Math.ceil(machineDies.length / localPageSize) || Math.abs(pageNum - localPage) <= 1) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setLocalPage(pageNum)}
                              className={`w-7 h-7 rounded-sm text-xs font-mono uppercase transition cursor-pointer ${
                                localPage === pageNum
                                  ? 'bg-[#1f1f1f] text-blue-400 border border-blue-500/40'
                                  : 'border border-[#2a2a2a] bg-[#141414] text-[#6b7280] hover:text-[#e4e4e4]'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        }
                        if (pageNum === 2 || pageNum === Math.ceil(machineDies.length / localPageSize) - 1) {
                          return <span key={pageNum} className="text-[#404040] text-xs px-1 select-none">...</span>
                        }
                        return null
                      })}
                      <button
                        onClick={() => setLocalPage(p => Math.min(Math.ceil(machineDies.length / localPageSize), p + 1))}
                        disabled={localPage === Math.ceil(machineDies.length / localPageSize)}
                        className="px-2.5 py-1 rounded-sm border border-[#2a2a2a] bg-[#141414] text-xs font-mono uppercase text-[#6b7280] hover:text-[#e4e4e4] disabled:opacity-40 transition cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
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
        <div className="space-y-4 font-mono">
          <div className="border-b border-[#2a2a2a] pb-3">
            <div className="flex items-center gap-1.5 text-xs text-[#6b7280] uppercase tracking-wider mb-0.5">
              <Cpu className="h-3.5 w-3.5 text-blue-500" />
              <span>01 MACHINE EXPLORER</span>
            </div>
            <h2 className="text-sm md:text-base font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">{rawMachine?.name || 'Machine'}</h2>
          </div>
          <div className="flex flex-col items-center justify-center text-center p-8 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm max-w-md mx-auto select-none font-mono">
            <Cpu className="h-8 w-8 text-[#404040] mb-3" />
            <p className="text-[#6b7280] text-xs uppercase">No dies assigned to this machine match the filters.</p>
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
  moveDieLocationMutation,
  selectedDieIds,
  onSelectId,
  onSelectAll
}: SetViewProps) {
  const columns = getInventoryColumns(navigate)
  const setDies = selectedSetData?.set.dies || []

  const [sizeSort, setSizeSort] = useState<'none' | 'asc' | 'desc'>('none')
  const [localPage, setLocalPage] = useState(1)
  const localPageSize = 25

  useEffect(() => {
    setLocalPage(1)
  }, [selectedSetData, sizeSort])

  const getDieSize = (die: any) => {
    if (die.die_type === 'ROUND') {
      return parseFloat(die.current_size) || parseFloat(die.punched_size) || 0
    } else {
      return parseFloat(die.current_width) || parseFloat(die.punched_width) || 0
    }
  }

  const sortedSetDies = useMemo(() => {
    if (sizeSort === 'none') return setDies
    return [...setDies].sort((a: any, b: any) => {
      const sizeA = getDieSize(a)
      const sizeB = getDieSize(b)
      return sizeSort === 'desc' ? sizeB - sizeA : sizeA - sizeB
    })
  }, [setDies, sizeSort])

  const paginatedSetDies = useMemo(() => {
    return sortedSetDies.slice((localPage - 1) * localPageSize, localPage * localPageSize)
  }, [sortedSetDies, localPage])

  const renderPaginationControls = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[#1a1a1a] pt-4 gap-3 select-none font-mono">
      <div className="text-xs text-[#6b7280] tabular-nums">
        SHOWING {(localPage - 1) * localPageSize + 1} TO {Math.min(localPage * localPageSize, sortedSetDies.length)} OF {sortedSetDies.length} ENTRIES
      </div>
      <div className="flex items-center space-x-1.5 bg-[#0f0f0f] p-1 rounded-sm border border-[#2a2a2a]">
        <button
          onClick={() => setLocalPage(p => Math.max(1, p - 1))}
          disabled={localPage === 1}
          className="px-2.5 py-1 rounded-sm border border-[#2a2a2a] bg-[#141414] text-xs font-mono uppercase text-[#6b7280] hover:text-[#e4e4e4] disabled:opacity-40 transition cursor-pointer"
        >
          Previous
        </button>
        {Array.from({ length: Math.ceil(sortedSetDies.length / localPageSize) }).map((_, i) => {
          const pageNum = i + 1
          if (pageNum === 1 || pageNum === Math.ceil(sortedSetDies.length / localPageSize) || Math.abs(pageNum - localPage) <= 1) {
            return (
              <button
                key={pageNum}
                onClick={() => setLocalPage(pageNum)}
                className={`w-7 h-7 rounded-sm text-xs font-mono uppercase transition cursor-pointer ${
                  localPage === pageNum
                    ? 'bg-[#1f1f1f] text-blue-400 border border-blue-500/40'
                    : 'border border-[#2a2a2a] bg-[#141414] text-[#6b7280] hover:text-[#e4e4e4]'
                }`}
              >
                {pageNum}
              </button>
            )
          }
          if (pageNum === 2 || pageNum === Math.ceil(sortedSetDies.length / localPageSize) - 1) {
            return <span key={pageNum} className="text-[#404040] text-xs px-1 select-none">...</span>
          }
          return null
        })}
        <button
          onClick={() => setLocalPage(p => Math.min(Math.ceil(sortedSetDies.length / localPageSize), p + 1))}
          disabled={localPage === Math.ceil(sortedSetDies.length / localPageSize)}
          className="px-2.5 py-1 rounded-sm border border-[#2a2a2a] bg-[#141414] text-xs font-mono uppercase text-[#6b7280] hover:text-[#e4e4e4] disabled:opacity-40 transition cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 font-mono">
      {selectedSetData ? (
        <>
          <div className="border-b border-[#2a2a2a] pb-3 select-none">
            <div className="flex items-center gap-1.5 text-xs text-[#6b7280] uppercase tracking-wider mb-0.5">
              <span>{selectedSetData.machine?.name}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-purple-400">{selectedSetData.set.name}</span>
            </div>
            <h2 className="text-sm md:text-base font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">{selectedSetData.set.name}</h2>
            <p className="text-[#6b7280] text-xs mt-0.5">Assigned to machine: {selectedSetData.machine?.name}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 select-none">
            <div className="bg-[#0f0f0f] rounded-sm p-3 border border-[#1a1a1a] flex flex-col justify-between">
              <span className="text-[#6b7280] text-[10px] uppercase tracking-wider">TOTAL DIES</span>
              <span className="text-xl font-bold font-mono text-[#e4e4e4] mt-1 tabular-nums">{setDies.length}</span>
            </div>
            <div className="bg-[#0f0f0f] rounded-sm p-3 border border-[#1a1a1a] border-l-2 border-l-emerald-500 flex flex-col justify-between">
              <span className="text-[#6b7280] text-[10px] uppercase tracking-wider">ACTIVE DIES</span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
                {setDies.filter(isDieActive).length}
              </span>
            </div>
            <div className="bg-[#0f0f0f] rounded-sm p-3 border border-[#1a1a1a] border-l-2 border-l-red-500 flex flex-col justify-between">
              <span className="text-[#6b7280] text-[10px] uppercase tracking-wider">INACTIVE DIES</span>
              <span className="text-xl font-bold font-mono text-red-400 mt-1 tabular-nums">
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
              <div className="bg-[#0f0f0f] rounded-sm p-3 border border-[#1a1a1a] select-none font-mono">
                <h3 className="text-xs font-medium text-[#6b7280] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                  <span>OPERATIONAL RATIO</span>
                </h3>
                <div className="flex justify-between text-[10px] uppercase mb-1.5 tabular-nums">
                  <span className="text-emerald-400">ACTIVE: {active} ({activePct}%)</span>
                  <span className="text-red-400">INACTIVE: {inactive} ({inactivePct}%)</span>
                </div>
                <div className="w-full bg-[#0a0a0a] h-2 rounded-none overflow-hidden flex border border-[#2a2a2a]">
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${activePct}%` }} />
                  <div className="bg-red-500 h-full transition-all" style={{ width: `${inactivePct}%`, marginLeft: 'auto' }} />
                </div>
              </div>
            )
          })()}

          <div className="space-y-3">
            <div className="flex justify-between items-center select-none font-mono">
              <h3 className="text-xs font-medium text-[#6b7280] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-purple-400" />
                <span>
                  {viewMode === 'grid' ? '03 ASSIGNED GRID' : viewMode === 'list' ? '03 ASSIGNED CATALOG' : '03 LOCATION RACK PLACEMENT'}
                </span>
              </h3>
              
              {viewMode !== 'rack' && setDies.length > 0 && (
                <button
                  onClick={() => {
                    setSizeSort(prev => {
                      if (prev === 'none') return 'desc'
                      if (prev === 'desc') return 'asc'
                      return 'none'
                    })
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] rounded-sm text-[10px] font-mono uppercase tracking-wider transition cursor-pointer"
                >
                  <ArrowUpDown className="h-3 w-3 text-blue-500" />
                  <span>
                    SORT: {sizeSort === 'none' ? 'DEFAULT' : sizeSort === 'desc' ? 'SIZE: DESC' : 'SIZE: ASC'}
                  </span>
                </button>
              )}
            </div>
            
            {viewMode === 'grid' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-fadeIn">
                  {paginatedSetDies.map((die: any) => (
                    <DieCard 
                      key={die.die_id} 
                      die={die} 
                      onClick={() => navigate(`/dies/${die.die_id}`)} 
                    />
                  ))}
                </div>
                {sortedSetDies.length > localPageSize && renderPaginationControls()}
              </div>
            ) : viewMode === 'list' ? (
              <div className="animate-fadeIn space-y-3">
                <DataTable 
                  columns={columns} 
                  rows={paginatedSetDies} 
                  onRowClick={(row) => navigate(`/dies/${row.die_id}`)}
                  selectedIds={selectedDieIds}
                  onSelectId={onSelectId}
                  onSelectAll={onSelectAll}
                />
                {sortedSetDies.length > localPageSize && renderPaginationControls()}
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
        <div className="space-y-4 font-mono">
          <div className="border-b border-[#2a2a2a] pb-3 select-none">
            <div className="flex items-center gap-1.5 text-xs text-[#6b7280] uppercase tracking-wider mb-0.5">
              <span>{rawSetData?.machine?.name || 'Machine'}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-purple-400">{rawSetData?.set?.name || 'Set'}</span>
            </div>
            <h2 className="text-sm md:text-base font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">{rawSetData?.set?.name || 'Set'}</h2>
          </div>
          <div className="flex flex-col items-center justify-center text-center p-8 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm max-w-md mx-auto select-none font-mono">
            <Layers className="h-8 w-8 text-[#404040] mb-3" />
            <p className="text-[#6b7280] text-xs uppercase">No dies assigned to this set match the filters.</p>
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
  pageSize,
  selectedDieIds,
  onSelectId,
  onSelectAll
}: UnassignedViewProps) {
  const columns = getInventoryColumns(navigate)

  return (
    <div className="space-y-4 font-mono animate-fadeIn">
      <div className="border-b border-[#2a2a2a] pb-3 select-none">
        <div className="flex items-center gap-1.5 text-xs text-[#6b7280] uppercase tracking-wider mb-0.5">
          <Sliders className="h-3.5 w-3.5 text-amber-500" />
          <span>01 STANDALONE INVENTORY</span>
        </div>
        <h2 className="text-sm md:text-base font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">Unassigned / Standalone Dies</h2>
        <p className="text-[#6b7280] text-xs mt-0.5">Production dies that are currently unassigned to any machine set.</p>
      </div>

      {unassignedDies && unassignedDies.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl select-none font-mono">
            <div className="bg-[#0f0f0f] rounded-sm p-3 border border-[#1a1a1a] flex flex-col justify-between">
              <span className="text-[#6b7280] text-[10px] uppercase tracking-wider">TOTAL STANDALONE</span>
              <span className="text-xl font-bold font-mono text-amber-400 mt-1 tabular-nums">{totalCount}</span>
            </div>
            <div className="bg-[#0f0f0f] rounded-sm p-3 border border-[#1a1a1a] border-l-2 border-l-emerald-500 flex flex-col justify-between">
              <span className="text-[#6b7280] text-[10px] uppercase tracking-wider">ACTIVE</span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
                {unassignedDies.filter(isDieActive).length}
              </span>
            </div>
            <div className="bg-[#0f0f0f] rounded-sm p-3 border border-[#1a1a1a] border-l-2 border-l-red-500 flex flex-col justify-between">
              <span className="text-[#6b7280] text-[10px] uppercase tracking-wider">INACTIVE</span>
              <span className="text-xl font-bold font-mono text-red-400 mt-1 tabular-nums">
                {totalCount - unassignedDies.filter(isDieActive).length}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between select-none font-mono">
              <h3 className="text-xs font-medium text-[#6b7280] uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-amber-500" />
                <span>
                  {viewMode === 'grid' ? 'STANDALONE GRID' : viewMode === 'list' ? 'STANDALONE CATALOG' : 'LOCATION RACK PLACEMENT'}
                </span>
              </h3>
              <span className="text-xs text-[#6b7280] tabular-nums">
                SHOWING {unassignedDies.length} OF {totalCount} {totalCount === 1 ? 'RESULT' : 'RESULTS'}
              </span>
            </div>

            {/* View Mode Router */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-fadeIn">
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
                  selectedIds={selectedDieIds}
                  onSelectId={onSelectId}
                  onSelectAll={onSelectAll}
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
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[#1a1a1a] pt-4 gap-3 select-none font-mono">
                <div className="text-xs text-[#6b7280] tabular-nums">
                  SHOWING {(page - 1) * pageSize + 1} TO {Math.min(page * pageSize, totalCount)} OF {totalCount} ENTRIES
                </div>
                <div className="flex items-center space-x-1.5 bg-[#0f0f0f] p-1 rounded-sm border border-[#2a2a2a]">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1 rounded-sm border border-[#2a2a2a] bg-[#141414] text-xs font-mono uppercase text-[#6b7280] hover:text-[#e4e4e4] disabled:opacity-40 transition cursor-pointer"
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
                          className={`w-7 h-7 rounded-sm text-xs font-mono uppercase transition cursor-pointer ${
                            page === pageNum
                              ? 'bg-[#1f1f1f] text-blue-400 border border-blue-500/40'
                              : 'border border-[#2a2a2a] bg-[#141414] text-[#6b7280] hover:text-[#e4e4e4]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    }
                    if (pageNum === 2 || pageNum === Math.ceil(totalCount / pageSize) - 1) {
                      return <span key={pageNum} className="text-[#404040] text-xs px-1 select-none">...</span>
                    }
                    return null
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                    disabled={page === Math.ceil(totalCount / pageSize)}
                    className="px-2.5 py-1 rounded-sm border border-[#2a2a2a] bg-[#141414] text-xs font-mono uppercase text-[#6b7280] hover:text-[#e4e4e4] disabled:opacity-40 transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm max-w-md mx-auto select-none font-mono">
          <Sliders className="h-8 w-8 text-[#404040] mb-3" />
          <p className="text-[#6b7280] text-xs uppercase">No unassigned dies match the current filters.</p>
        </div>
      )}
    </div>
  )
}
