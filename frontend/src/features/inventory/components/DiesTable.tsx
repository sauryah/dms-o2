import React, { memo, useState, useMemo, useEffect } from 'react'
import { List, RowComponentProps } from 'react-window'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../contexts/AuthContext'
import { useToast } from '../../../contexts/ToastContext'
import { useApi } from '../../../hooks/useApi'

const VirtualizedList = List as any

const isDieActive = (die: any) => {
  return ['AVAILABLE', 'RUNNING', 'CLEANING', 'POLISHING'].includes(die.status)
}

interface DiesTableProps {
  diesList: any[];
  navigate: any;
  onDragStartDie?: (id: string) => void;
  onDragEndDie?: () => void;
  sortField?: string;
  sortOrder?: string;
  onSort?: (field: string) => void;
}

export const DiesTable = memo(function DiesTable({ 
  diesList = [], 
  navigate, 
  onDragStartDie, 
  onDragEndDie,
  sortField: externalSortField,
  sortOrder: externalSortOrder,
  onSort
}: DiesTableProps) {
  const { role } = useAuth()
  const { request } = useApi()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const canEdit = role === 'ROOT' || role === 'ADMIN'
  const canChangeStatus = role === 'ROOT' || role === 'ADMIN' || role === 'OPERATOR'

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleStatusChange = async (dieId: string, newStatus: string) => {
    await queryClient.cancelQueries({ queryKey: ['dies'] })
    await queryClient.cancelQueries({ queryKey: ['searchDies'] })

    const previousDiesQueries = queryClient.getQueriesData({ queryKey: ['dies'] })
    const previousSearchDiesQueries = queryClient.getQueriesData({ queryKey: ['searchDies'] })
    const previousIndividualDie = queryClient.getQueryData(['die', dieId])
    const previousIndividualDieDetail = queryClient.getQueryData(['dieDetail', dieId])

    const updateStatus = (old: any) => {
      if (!old) return old
      if (Array.isArray(old)) {
        return old.map((die: any) => die.die_id === dieId ? { ...die, status: newStatus } : die)
      }
      if (Array.isArray(old.results)) {
        return {
          ...old,
          results: old.results.map((die: any) => die.die_id === dieId ? { ...die, status: newStatus } : die)
        }
      }
      return old
    }

    queryClient.setQueriesData({ queryKey: ['dies'] }, updateStatus)
    queryClient.setQueriesData({ queryKey: ['searchDies'] }, updateStatus)

    if (previousIndividualDie !== undefined) {
      queryClient.setQueryData(['die', dieId], (old: any) => old ? { ...old, status: newStatus } : old)
    }
    if (previousIndividualDieDetail !== undefined) {
      queryClient.setQueryData(['dieDetail', dieId], (old: any) => old ? { ...old, status: newStatus } : old)
    }

    try {
      await request(`/api/dies/${dieId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      })
      showToast(`Successfully updated status of die ${dieId} to ${newStatus}.`, 'success')
    } catch (err: any) {
      console.error(err)
      if (previousDiesQueries) {
        previousDiesQueries.forEach(([key, val]: any) => queryClient.setQueryData(key, val))
      }
      if (previousSearchDiesQueries) {
        previousSearchDiesQueries.forEach(([key, val]: any) => queryClient.setQueryData(key, val))
      }
      if (previousIndividualDie !== undefined) {
        queryClient.setQueryData(['die', dieId], previousIndividualDie)
      }
      if (previousIndividualDieDetail !== undefined) {
        queryClient.setQueryData(['dieDetail', dieId], previousIndividualDieDetail)
      }
      showToast(`Error updating die status: ${err.message}`, 'error')
    } finally {
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['searchDies'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
      queryClient.invalidateQueries({ queryKey: ['searchDiesDashboard'] })
      queryClient.invalidateQueries({ queryKey: ['die', dieId] })
      queryClient.invalidateQueries({ queryKey: ['dieDetail', dieId] })
    }
  }

  const [localSortField, setLocalSortField] = useState('die_id')
  const [localSortOrder, setLocalSortOrder] = useState('asc')

  const sortField = externalSortField !== undefined ? externalSortField : localSortField
  const sortOrder = externalSortOrder !== undefined ? externalSortOrder : localSortOrder

  const [selectedDieIds, setSelectedDieIds] = useState(new Set<string>())
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkLocation, setBulkLocation] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const [activeRowIndex, setActiveRowIndex] = useState(-1)
  const listRef = React.useRef<any>(null)

  const statusLabels: Record<string, string> = {
    AVAILABLE: 'Available',
    RUNNING: 'Running',
    CLEANING: 'Cleaning',
    POLISHING: 'Polishing',
    MAINTENANCE: 'Maintenance',
    DAMAGED: 'Damaged',
    SCRAPPED: 'Scrapped',
    MISSING: 'Missing',
  }

  React.useEffect(() => {
    if (listRef.current && activeRowIndex >= 0) {
      listRef.current.scrollToItem(activeRowIndex, 'smart')
    }
  }, [activeRowIndex])

  const handleTableKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveRowIndex(prev => {
        const next = prev + 1
        return next < sortedDies.length ? next : prev
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveRowIndex(prev => {
        const next = prev - 1
        return next >= 0 ? next : prev
      })
    } else if (e.key === 'Enter') {
      if (activeRowIndex >= 0 && activeRowIndex < sortedDies.length) {
        e.preventDefault()
        const selectedDie = sortedDies[activeRowIndex]
        navigate(`/dies/${selectedDie.die_id}`)
      }
    } else if (e.key === '/') {
      e.preventDefault()
      const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
        searchInput.select()
      }
    }
  }

  const handleSort = (field: string) => {
    if (onSort) {
      onSort(field)
    } else {
      if (localSortField === field) {
        setLocalSortOrder(localSortOrder === 'asc' ? 'desc' : 'asc')
      } else {
        setLocalSortField(field)
        setLocalSortOrder('asc')
      }
    }
  }

  const sortedDies = useMemo(() => {
    if (sortField === 'relevance') {
      return diesList
    }
    return [...diesList].sort((a, b) => {
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
  }, [diesList, sortField, sortOrder])

  const toggleSelectOne = (dieId: string) => {
    setSelectedDieIds(prev => {
      const next = new Set(prev)
      if (next.has(dieId)) {
        next.delete(dieId)
      } else {
        next.add(dieId)
      }
      return next
    })
  }
  
  const isAllSelected = sortedDies.length > 0 && sortedDies.every(d => selectedDieIds.has(d.die_id));

  const toggleSelectAll = () => {
    setSelectedDieIds(prev => {
      const next = new Set(prev);
      if (isAllSelected) {
        sortedDies.forEach(d => next.delete(d.die_id));
      } else {
        sortedDies.forEach(d => next.add(d.die_id));
      }
      return next;
    });
  }

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus) return
    setIsUpdating(true)
    await queryClient.cancelQueries({ queryKey: ['dies'] })
    await queryClient.cancelQueries({ queryKey: ['searchDies'] })

    const previousDiesQueries = queryClient.getQueriesData({ queryKey: ['dies'] })
    const previousSearchDiesQueries = queryClient.getQueriesData({ queryKey: ['searchDies'] })

    const updateStatus = (old: any) => {
      if (!Array.isArray(old)) return old
      return old.map((die: any) => {
        if (selectedDieIds.has(die.die_id)) {
          return { ...die, status: bulkStatus }
        }
        return die
      })
    }
    queryClient.setQueriesData({ queryKey: ['dies'] }, updateStatus)
    queryClient.setQueriesData({ queryKey: ['searchDies'] }, updateStatus)

    const affectedDieIds = Array.from(selectedDieIds)
    const previousIndividualDies: [any, any][] = []
    affectedDieIds.forEach(dieId => {
      const p1 = queryClient.getQueryData(['die', dieId])
      const p2 = queryClient.getQueryData(['dieDetail', dieId])
      if (p1 !== undefined) {
        previousIndividualDies.push([['die', dieId], p1])
        queryClient.setQueryData(['die', dieId], (old: any) => old ? { ...old, status: bulkStatus } : old)
      }
      if (p2 !== undefined) {
        previousIndividualDies.push([['dieDetail', dieId], p2])
        queryClient.setQueryData(['dieDetail', dieId], (old: any) => old ? { ...old, status: bulkStatus } : old)
      }
    })

    const snapshotDieIds = new Set(selectedDieIds)
    setSelectedDieIds(new Set())
    setBulkStatus('')

    try {
      for (const dieId of snapshotDieIds) {
        await request(`/api/dies/${dieId}/`, {
          method: 'PATCH',
          body: JSON.stringify({ status: bulkStatus })
        })
      }
      showToast(`Successfully updated status of ${snapshotDieIds.size} dies to ${bulkStatus}.`, 'success')
    } catch (err: any) {
      console.error(err)
      if (previousDiesQueries) {
        previousDiesQueries.forEach(([key, val]: any) => queryClient.setQueryData(key, val))
      }
      if (previousSearchDiesQueries) {
        previousSearchDiesQueries.forEach(([key, val]: any) => queryClient.setQueryData(key, val))
      }
      previousIndividualDies.forEach(([key, val]: any) => queryClient.setQueryData(key, val))
      showToast(`Error updating statuses: ${err.message}`, 'error')
    } finally {
      setIsUpdating(false)
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['searchDies'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
      queryClient.invalidateQueries({ queryKey: ['searchDiesDashboard'] })
      affectedDieIds.forEach(dieId => {
        queryClient.invalidateQueries({ queryKey: ['die', dieId] })
        queryClient.invalidateQueries({ queryKey: ['dieDetail', dieId] })
      })
    }
  }

  const handleBulkLocationUpdate = async () => {
    if (!bulkLocation.trim()) return
    setIsUpdating(true)

    await queryClient.cancelQueries({ queryKey: ['dies'] })
    await queryClient.cancelQueries({ queryKey: ['searchDies'] })

    const nextLocation = bulkLocation.trim()

    const previousDiesQueries = queryClient.getQueriesData({ queryKey: ['dies'] })
    const previousSearchDiesQueries = queryClient.getQueriesData({ queryKey: ['searchDies'] })

    const updateLocation = (old: any) => {
      if (!Array.isArray(old)) return old
      return old.map((die: any) => {
        if (selectedDieIds.has(die.die_id)) {
          return { ...die, location: nextLocation }
        }
        return die
      })
    }
    queryClient.setQueriesData({ queryKey: ['dies'] }, updateLocation)
    queryClient.setQueriesData({ queryKey: ['searchDies'] }, updateLocation)

    const affectedDieIds = Array.from(selectedDieIds)
    const previousIndividualDies: [any, any][] = []
    affectedDieIds.forEach(dieId => {
      const p1 = queryClient.getQueryData(['die', dieId])
      const p2 = queryClient.getQueryData(['dieDetail', dieId])
      if (p1 !== undefined) {
        previousIndividualDies.push([['die', dieId], p1])
        queryClient.setQueryData(['die', dieId], (old: any) => old ? { ...old, location: nextLocation } : old)
      }
      if (p2 !== undefined) {
        previousIndividualDies.push([['dieDetail', dieId], p2])
        queryClient.setQueryData(['dieDetail', dieId], (old: any) => old ? { ...old, location: nextLocation } : old)
      }
    })

    const snapshotDieIds = new Set(selectedDieIds)
    setSelectedDieIds(new Set())
    setBulkLocation('')

    try {
      for (const dieId of snapshotDieIds) {
        await request(`/api/dies/${dieId}/`, {
          method: 'PATCH',
          body: JSON.stringify({ location: nextLocation })
        })
      }
      showToast(`Successfully updated location of ${snapshotDieIds.size} dies to "${nextLocation}".`, 'success')
    } catch (err: any) {
      console.error(err)
      if (previousDiesQueries) {
        previousDiesQueries.forEach(([key, val]: any) => queryClient.setQueryData(key, val))
      }
      if (previousSearchDiesQueries) {
        previousSearchDiesQueries.forEach(([key, val]: any) => queryClient.setQueryData(key, val))
      }
      previousIndividualDies.forEach(([key, val]: any) => queryClient.setQueryData(key, val))
      showToast(`Error updating locations: ${err.message}`, 'error')
    } finally {
      setIsUpdating(false)
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['searchDies'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
      queryClient.invalidateQueries({ queryKey: ['searchDiesDashboard'] })
      affectedDieIds.forEach(dieId => {
        queryClient.invalidateQueries({ queryKey: ['die', dieId] })
        queryClient.invalidateQueries({ queryKey: ['dieDetail', dieId] })
      })
    }
  }

  const statusColors: Record<string, string> = {
    AVAILABLE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    RUNNING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    CLEANING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    POLISHING: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    DAMAGED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    SCRAPPED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    MISSING: 'bg-red-500/10 text-red-400 border-red-500/20',
    MAINTENANCE: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  }

  const Row = ({ index, style, ariaAttributes }: RowComponentProps) => {
    const die = sortedDies[index];
    if (!die) return null;
    const isSelected = selectedDieIds.has(die.die_id);
    const isActiveRow = index === activeRowIndex;
    return (
      <div
        {...ariaAttributes}
        style={style}
        draggable={canEdit}
        onDragStart={(e) => {
          if (canEdit) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('application/json', JSON.stringify({ type: 'die', id: die.die_id }));
            if (onDragStartDie) onDragStartDie(die.die_id);
          }
        }}
        onDragEnd={() => {
          if (onDragEndDie) onDragEndDie();
        }}
        className={`grid ${canEdit ? 'grid-cols-[48px_1.5fr_1fr_1.5fr_1.5fr_1fr_1fr_1fr_1.2fr]' : 'grid-cols-[1.5fr_1fr_1.5fr_1.5fr_1fr_1fr_1fr_1.2fr]'} items-center hover:bg-slate-850/30 border-b border-slate-800/40 transition-colors duration-200 ${canEdit ? 'cursor-grab active:cursor-grabbing' : ''} ${isSelected ? 'bg-blue-600/5' : ''} ${isActiveRow ? 'bg-blue-600/10 border-l-4 border-blue-500' : ''}`}
      >
        {canEdit && (
          <div className="text-center px-3 sm:px-6">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelectOne(die.die_id)}
              className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer w-4 h-4"
            />
          </div>
        )}
        <div className="px-3 sm:px-6 text-white font-bold truncate font-mono text-sm">{die.die_id}</div>
        <div className="px-3 sm:px-6 text-slate-300 truncate font-mono text-sm">{die.casing}</div>
        <div className="px-3 sm:px-6 text-slate-300 font-semibold truncate font-mono text-sm">
          {die.die_type === 'ROUND' ? (
            <span>Ø {die.current_size || '—'} mm</span>
          ) : (
            <span>
              {die.current_width || '—'} × {die.current_thickness || '—'} mm
              {die.radius ? ` (R: ${die.radius} mm)` : ''}
            </span>
          )}
        </div>
        <div className="px-3 sm:px-6 text-slate-300 truncate text-sm">{die.location || '—'}</div>
        <div className="px-3 sm:px-6 text-slate-300">
          <span className="px-2 py-0.5 text-xxs font-mono font-semibold bg-slate-800 rounded border border-slate-700/50">
            {die.die_type}
          </span>
        </div>
        <div className="px-3 sm:px-6">
          {canChangeStatus ? (
            <select
              value={die.status}
              onChange={(e) => handleStatusChange(die.die_id, e.target.value)}
              className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded-md border bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer ${
                statusColors[die.status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'
              }`}
            >
              {Object.keys(statusColors).map(statusOpt => (
                <option key={statusOpt} value={statusOpt} className="bg-slate-950 text-slate-350 text-xs">
                  {statusLabels[statusOpt] || statusOpt}
                </option>
              ))}
            </select>
          ) : (
            <span className={`px-2 py-0.5 text-xxs font-mono font-semibold rounded-md border ${
              statusColors[die.status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'
            }`}>
              {statusLabels[die.status] || die.status}
            </span>
          )}
        </div>
        <div className="px-3 sm:px-6 text-slate-400 text-xs font-mono">
          {new Date(die.updated_at).toLocaleDateString()}
        </div>
        <div className="px-3 sm:px-6 text-right">
          <button
            onClick={() => navigate(`/dies/${die.die_id}`)}
            className="bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            View Details
          </button>
        </div>
      </div>
    );
  };

  // Mobile card view
  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Bulk Action Bar */}
        {selectedDieIds.size > 0 && (
          <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800/80 rounded-xl px-4 py-3 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">
                <span className="font-extrabold text-blue-400">{selectedDieIds.size}</span> selected
              </span>
              <button
                onClick={() => { setSelectedDieIds(new Set()); setBulkStatus(''); setBulkLocation(''); }}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700"
              >
                Cancel
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 flex-1 min-w-0"
              >
                <option value="">Set Status...</option>
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
                className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                {isUpdating ? '...' : 'Apply'}
              </button>
              <input
                type="text"
                value={bulkLocation}
                onChange={(e) => setBulkLocation(e.target.value)}
                placeholder="Location..."
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-500 flex-1 min-w-0"
              />
              <button
                onClick={handleBulkLocationUpdate}
                disabled={!bulkLocation.trim() || isUpdating}
                className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                {isUpdating ? '...' : 'Set'}
              </button>
            </div>
          </div>
        )}

        {/* Card List */}
        {sortedDies.length === 0 ? (
          <div className="text-center py-12 text-slate-500 italic">No dies found.</div>
        ) : (
          sortedDies.map((die) => {
            const isSelected = selectedDieIds.has(die.die_id)
            return (
              <div
                key={die.die_id}
                className={`bg-slate-900 border rounded-xl p-4 transition-all duration-200 ${
                  isSelected ? 'border-blue-500/40 bg-blue-600/5' : 'border-slate-800/60'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {canEdit && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(die.die_id)}
                        className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-2 focus:ring-blue-500 w-4 h-4 shrink-0 mt-0.5"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold font-mono text-sm truncate">{die.die_id}</span>
                        <span className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded border bg-slate-800 text-slate-300 border-slate-700`}>
                          {die.die_type}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs mt-0.5 font-mono">{die.casing}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
                  <div>
                    <span className="text-slate-500">Size: </span>
                    <span className="text-slate-200 font-mono">
                      {die.die_type === 'ROUND'
                        ? `Ø ${die.current_size || '—'} mm`
                        : `${die.current_width || '—'}×${die.current_thickness || '—'} mm`
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Location: </span>
                    <span className="text-slate-200 truncate">{die.location || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Updated: </span>
                    <span className="text-slate-200">{new Date(die.updated_at).toLocaleDateString()}</span>
                  </div>
                  <div>
                    {canChangeStatus ? (
                      <select
                        value={die.status}
                        onChange={(e) => handleStatusChange(die.die_id, e.target.value)}
                        className={`text-[10px] font-mono font-semibold rounded-md border bg-slate-900 px-1.5 py-0.5 w-full ${
                          statusColors[die.status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}
                      >
                        {Object.keys(statusColors).map(opt => (
                          <option key={opt} value={opt}>{statusLabels[opt] || opt}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md border ${
                        statusColors[die.status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>
                        {statusLabels[die.status] || die.status}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/dies/${die.die_id}`)}
                  className="w-full bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 py-2 rounded-xl text-xs font-semibold transition"
                >
                  View Details
                </button>
              </div>
            )
          })
        )}
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Floating Bulk Action Bar */}
      {selectedDieIds.size > 0 && (
        <div className="bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 dot-glow animate-pulse shrink-0" />
            <span className="text-sm font-semibold text-slate-200">
              <span className="font-extrabold text-blue-400">{selectedDieIds.size}</span> dies selected
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 w-full sm:w-auto">
            {/* Status Update Group */}
            <div className="flex flex-col xs:flex-row xs:items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status:</span>
              <div className="flex gap-2 w-full xs:w-auto">
                <select
                  value={bulkStatus}
                  disabled={isUpdating}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none flex-1 xs:flex-none"
                >
                  <option value="">— Select —</option>
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
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {isUpdating ? '...' : 'Apply'}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-[1px] h-6 bg-slate-800" />

            {/* Location Update Group */}
            <div className="flex flex-col xs:flex-row xs:items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Location:</span>
              <div className="flex gap-2 w-full xs:w-auto">
                <input
                  type="text"
                  value={bulkLocation}
                  disabled={isUpdating}
                  onChange={(e) => setBulkLocation(e.target.value)}
                  placeholder="e.g. Rack A - Shelf 3"
                  className="bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none flex-1 xs:flex-none xs:w-36"
                />

                <button
                  onClick={handleBulkLocationUpdate}
                  disabled={!bulkLocation.trim() || isUpdating}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {isUpdating ? '...' : 'Apply'}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-[1px] h-6 bg-slate-800" />

            <button
              onClick={() => { setSelectedDieIds(new Set()); setBulkStatus(''); setBulkLocation(''); }}
              disabled={isUpdating}
              className="text-xs text-slate-400 hover:text-white px-3.5 py-2 rounded-xl border border-slate-800 hover:border-slate-700 transition self-end sm:self-auto"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="w-full overflow-x-auto md:overflow-hidden bg-slate-900">
        <div className="min-w-[700px] md:min-w-0">
          {/* Header */}
          <div className={`grid ${canEdit ? 'grid-cols-[48px_1.5fr_1fr_1.5fr_1.5fr_1fr_1fr_1fr_1.2fr]' : 'grid-cols-[1.5fr_1fr_1.5fr_1.5fr_1fr_1fr_1fr_1.2fr]'} border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider py-4 select-none`}>
            {canEdit && (
              <div className="text-center px-3 sm:px-6">
                <input 
                  type="checkbox" 
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer w-4 h-4" 
                />
              </div>
            )}
            <div className="px-3 sm:px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('die_id')}>
              Die ID {sortField === 'die_id' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
            </div>
            <div className="px-3 sm:px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('casing')}>
              Casing {sortField === 'casing' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
            </div>
            <div className="px-3 sm:px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('current_size')}>
              Size / Dimensions {sortField === 'current_size' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
            </div>
            <div className="px-3 sm:px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('location')}>
              Location {sortField === 'location' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
            </div>
            <div className="px-3 sm:px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('category')}>
              Category {sortField === 'category' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
            </div>
            <div className="px-3 sm:px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('status')}>
              Status {sortField === 'status' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
            </div>
            <div className="px-3 sm:px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('updated_at')}>
              Last Updated {sortField === 'updated_at' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
            </div>
            <div className="px-3 sm:px-6 text-right">Actions</div>
          </div>

          {/* List Body */}
          <div
            tabIndex={0}
            onKeyDown={handleTableKeyDown}
            className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-b-2xl"
            aria-label="Dies Inventory Table. Use up and down arrow keys to navigate rows, Enter to view, slash to search."
          >
            <VirtualizedList
              ref={listRef}
              rowCount={sortedDies.length}
              rowHeight={60}
              rowComponent={Row}
              rowProps={{}}
              style={{ height: Math.min(window.innerHeight * 0.45, 500), width: '100%' }}
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-950/20 border-t border-slate-800 px-4 sm:px-6 py-3 sm:py-4">
        <span className="text-xs text-slate-500 font-medium">
          Showing all {diesList.length} dies
        </span>
      </div>
    </div>
  )
})
