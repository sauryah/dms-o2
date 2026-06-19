import React, { memo, useState, useMemo } from 'react'
import { List, RowComponentProps } from 'react-window'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth, useApi } from '../App'

const isDieActive = (die: any) => {
  return ['AVAILABLE', 'RUNNING', 'CLEANING', 'POLISHING'].includes(die.status)
}

interface DiesTableProps {
  diesList: any[];
  navigate: any;
  onDragStartDie?: (id: string) => void;
  onDragEndDie?: () => void;
}

export const DiesTable = memo(function DiesTable({ diesList = [], navigate, onDragStartDie, onDragEndDie }: DiesTableProps) {
  const { role } = useAuth()
  const { request } = useApi()
  const queryClient = useQueryClient()

  const canEdit = role === 'ROOT' || role === 'ADMIN'

  const [sortField, setSortField] = useState('die_id')
  const [sortOrder, setSortOrder] = useState('asc')

  const [selectedDieIds, setSelectedDieIds] = useState(new Set<string>())
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkLocation, setBulkLocation] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const sortedDies = useMemo(() => {
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
    try {
      for (const dieId of selectedDieIds) {
        await request(`/api/dies/${dieId}/`, {
          method: 'PATCH',
          body: JSON.stringify({ status: bulkStatus })
        })
      }
      setSelectedDieIds(new Set())
      setBulkStatus('')
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
      queryClient.invalidateQueries({ queryKey: ['searchDiesDashboard'] })
      alert(`Successfully updated status of ${selectedDieIds.size} dies to ${bulkStatus}.`)
    } catch (err: any) {
      console.error(err)
      alert(`Error updating statuses: ${err.message}`)
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
      setSelectedDieIds(new Set())
      setBulkLocation('')
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
      queryClient.invalidateQueries({ queryKey: ['searchDiesDashboard'] })
      alert(`Successfully updated location of ${selectedDieIds.size} dies to "${bulkLocation}".`)
    } catch (err: any) {
      console.error(err)
      alert(`Error updating locations: ${err.message}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const Row = ({ index, style }: RowComponentProps) => {
    const die = sortedDies[index];
    if (!die) return null;
    const active = isDieActive(die);
    const isSelected = selectedDieIds.has(die.die_id);
    return (
      <div
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
        className={`grid ${canEdit ? 'grid-cols-[48px_1.5fr_1fr_1.5fr_1.5fr_1fr_1fr_1fr_1.2fr]' : 'grid-cols-[1.5fr_1fr_1.5fr_1.5fr_1fr_1fr_1fr_1.2fr]'} items-center hover:bg-slate-850/30 border-b border-slate-800/40 transition-colors duration-200 ${canEdit ? 'cursor-grab active:cursor-grabbing' : ''} ${isSelected ? 'bg-blue-600/5' : ''}`}
      >
        {canEdit && (
          <div className="text-center px-6">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelectOne(die.die_id)}
              className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500/20 cursor-pointer w-4 h-4"
            />
          </div>
        )}
        <div className="px-6 text-white font-bold truncate">{die.die_id}</div>
        <div className="px-6 text-slate-300 truncate">{die.casing}</div>
        <div className="px-6 text-slate-300 font-semibold truncate">
          {die.die_type === 'ROUND' ? (
            <span>Ø {die.current_size || '—'} mm</span>
          ) : (
            <span>
              {die.current_width || '—'} × {die.current_thickness || '—'} mm
              {die.radius ? ` (R: ${die.radius} mm)` : ''}
            </span>
          )}
        </div>
        <div className="px-6 text-slate-300 truncate">{die.location || '—'}</div>
        <div className="px-6 text-slate-300">
          <span className="px-2 py-0.5 text-xxs font-semibold bg-slate-800 rounded border border-slate-700/50">
            {die.die_type}
          </span>
        </div>
        <div className="px-6">
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
            active
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {die.status}
          </span>
        </div>
        <div className="px-6 text-slate-400 text-xs">
          {new Date(die.updated_at).toLocaleDateString()}
        </div>
        <div className="px-6 text-right">
          <button
            onClick={() => navigate(`/dies/${die.die_id}`)}
            className="bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow-sm"
          >
            View Details
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Floating Bulk Action Bar */}
      {selectedDieIds.size > 0 && (
        <div className="bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 dot-glow animate-pulse" />
            <span className="text-sm font-semibold text-slate-200">
              <span className="font-extrabold text-blue-400">{selectedDieIds.size}</span> dies selected for batch edit
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            {/* Status Update Group */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Set status:</span>
              <select
                value={bulkStatus}
                disabled={isUpdating}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-1.5 text-xs text-slate-300 focus:outline-none"
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
                <option value="SCRAP">Scrap</option>
              </select>

              <button
                onClick={handleBulkStatusUpdate}
                disabled={!bulkStatus || isUpdating}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Updating...' : 'Apply Status'}
              </button>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-[1px] h-6 bg-slate-800" />

            {/* Location Update Group */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Set Location:</span>
              <input
                type="text"
                value={bulkLocation}
                disabled={isUpdating}
                onChange={(e) => setBulkLocation(e.target.value)}
                placeholder="e.g. Rack A - Shelf 3"
                className="bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none w-44"
              />

              <button
                onClick={handleBulkLocationUpdate}
                disabled={!bulkLocation.trim() || isUpdating}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Updating...' : 'Apply Location'}
              </button>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-[1px] h-6 bg-slate-800" />

            <button
              onClick={() => { setSelectedDieIds(new Set()); setBulkStatus(''); setBulkLocation(''); }}
              disabled={isUpdating}
              className="text-xs text-slate-400 hover:text-white px-3.5 py-2 rounded-xl border border-slate-800 hover:border-slate-700 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="w-full overflow-hidden bg-slate-900">
        {/* Header */}
        <div className={`grid ${canEdit ? 'grid-cols-[48px_1.5fr_1fr_1.5fr_1.5fr_1fr_1fr_1fr_1.2fr]' : 'grid-cols-[1.5fr_1fr_1.5fr_1.5fr_1fr_1fr_1fr_1.2fr]'} border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider py-4 select-none`}>
          {canEdit && (
            <div className="text-center px-6">
              <input 
                type="checkbox" 
                checked={isAllSelected}
                onChange={toggleSelectAll}
                className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500/20 cursor-pointer w-4 h-4" 
              />
            </div>
          )}
          <div className="px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('die_id')}>
            Die ID {sortField === 'die_id' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
          </div>
          <div className="px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('casing')}>
            Casing {sortField === 'casing' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
          </div>
          <div className="px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('current_size')}>
            Size / Dimensions {sortField === 'current_size' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
          </div>
          <div className="px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('location')}>
            Location {sortField === 'location' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
          </div>
          <div className="px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('category')}>
            Category {sortField === 'category' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
          </div>
          <div className="px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('status')}>
            Status {sortField === 'status' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
          </div>
          <div className="px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('updated_at')}>
            Last Updated {sortField === 'updated_at' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
          </div>
          <div className="px-6 text-right">Actions</div>
        </div>

        {/* List Body */}
        <div>
          <List
            rowCount={sortedDies.length}
            rowHeight={60}
            rowComponent={Row}
            rowProps={{}}
            style={{ height: 500, width: '100%' }}
          />
        </div>
      </div>

      <div className="bg-slate-950/20 border-t border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-6">
          <span className="text-xs text-slate-500 font-medium">
            Showing all {diesList.length} dies
          </span>
        </div>
      </div>
    </div>
  )
})
