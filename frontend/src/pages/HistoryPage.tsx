import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '../hooks/useApi'
import { useDebounce } from '../hooks/useDebounce'
import { Search, User, Filter, ArrowLeft, ArrowRight, Download, Layers, Activity } from 'lucide-react'

export function HistoryPage() {
  const { request } = useApi()
  const [activeTab, setActiveTab] = useState<'dies' | 'machines'>('dies')
  
  // Shared Filter States
  const [userInput, setUserInput] = useState('')
  const [fieldInput, setFieldInput] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)

  // Die Filter States
  const [dieIdInput, setDieIdInput] = useState('')

  // Machine Filter States
  const [entityNameInput, setEntityNameInput] = useState('')
  const [entityTypeInput, setEntityTypeInput] = useState('')
  const [actionInput, setActionInput] = useState('')

  // Debounced filters
  const debouncedUser = useDebounce(userInput, 300)
  const debouncedField = useDebounce(fieldInput, 300)
  const debouncedDieId = useDebounce(dieIdInput, 300)
  const debouncedEntityName = useDebounce(entityNameInput, 300)

  // Fetch Die History
  const { data: dieHistoryData, isLoading: isLoadingDies, error: errorDies } = useQuery({
    queryKey: ['dieHistory', debouncedDieId, debouncedUser, debouncedField, fromDate, toDate, page],
    enabled: activeTab === 'dies',
    queryFn: ({ signal }) => {
      const params = new URLSearchParams()
      if (debouncedDieId) params.append('die_id', debouncedDieId)
      if (debouncedUser) params.append('user', debouncedUser)
      if (debouncedField) params.append('field', debouncedField)
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)
      params.append('page', page.toString())
      params.append('page_size', '25')

      return request(`/api/history/?${params.toString()}`, { signal, keepMetadata: true })
    }
  })

  // Fetch Machine History
  const { data: machineHistoryData, isLoading: isLoadingMachines, error: errorMachines } = useQuery({
    queryKey: ['machineHistory', debouncedEntityName, entityTypeInput, actionInput, debouncedUser, debouncedField, fromDate, toDate, page],
    enabled: activeTab === 'machines',
    queryFn: ({ signal }) => {
      const params = new URLSearchParams()
      if (debouncedEntityName) params.append('entity_name', debouncedEntityName)
      if (entityTypeInput) params.append('entity_type', entityTypeInput)
      if (actionInput) params.append('action', actionInput)
      if (debouncedUser) params.append('user', debouncedUser)
      if (debouncedField) params.append('field', debouncedField)
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)
      params.append('page', page.toString())
      params.append('page_size', '25')

      return request(`/api/history/machines/?${params.toString()}`, { signal, keepMetadata: true })
    }
  })

  const handleTabChange = (tab: 'dies' | 'machines') => {
    setActiveTab(tab)
    setPage(1)
  }

  const isCurrentLoading = activeTab === 'dies' ? isLoadingDies : isLoadingMachines
  const currentError = activeTab === 'dies' ? errorDies : errorMachines
  const currentList = activeTab === 'dies' ? (dieHistoryData?.results || []) : (machineHistoryData?.results || [])
  const count = activeTab === 'dies' ? (dieHistoryData?.count || 0) : (machineHistoryData?.count || 0)
  const totalPages = Math.ceil(count / 25)

  // CSV Export
  const exportToCSV = async () => {
    try {
      const params = new URLSearchParams()
      if (debouncedUser) params.append('user', debouncedUser)
      if (debouncedField) params.append('field', debouncedField)
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)
      params.append('page_size', '10000') // fetch all matching up to 10k

      if (activeTab === 'dies') {
        if (debouncedDieId) params.append('die_id', debouncedDieId)
        const res = await request(`/api/history/?${params.toString()}`, { keepMetadata: true })
        const allResults = res?.results || []

        let csvContent = "Timestamp,Die ID,Field Changed,Old Value,New Value,Changed By,IP Address\n"
        allResults.forEach((h: any) => {
          const timestamp = h.timestamp ? new Date(h.timestamp).toLocaleString() : ''
          const dieId = h.die_id ?? ''
          const fieldName = h.field_name ?? ''
          const oldValue = `"${(h.old_value ?? "").replace(/"/g, '""')}"`
          const newValue = `"${(h.new_value ?? "").replace(/"/g, '""')}"`
          const changedBy = h.changed_by_username ?? 'System'
          const ipAddress = h.ip_address ?? ''
          csvContent += `${timestamp},${dieId},${fieldName},${oldValue},${newValue},${changedBy},${ipAddress}\n`
        })

        triggerCSVDownload(csvContent, `dms_die_history_${Date.now()}.csv`)
      } else {
        if (debouncedEntityName) params.append('entity_name', debouncedEntityName)
        if (entityTypeInput) params.append('entity_type', entityTypeInput)
        if (actionInput) params.append('action', actionInput)
        
        const res = await request(`/api/history/machines/?${params.toString()}`, { keepMetadata: true })
        const allResults = res?.results || []

        let csvContent = "Timestamp,Entity Type,Entity ID,Entity Name,Action,Field Changed,Old Value,New Value,Changed By,IP Address\n"
        allResults.forEach((h: any) => {
          const timestamp = h.timestamp ? new Date(h.timestamp).toLocaleString() : ''
          const entityType = h.entity_type ?? ''
          const entityId = h.entity_id ?? ''
          const entityName = h.entity_name ?? ''
          const action = h.action ?? ''
          const fieldName = h.field_name ?? ''
          const oldValue = `"${(h.old_value ?? "").replace(/"/g, '""')}"`
          const newValue = `"${(h.new_value ?? "").replace(/"/g, '""')}"`
          const changedBy = h.changed_by_username ?? 'System'
          const ipAddress = h.ip_address ?? ''
          csvContent += `${timestamp},${entityType},${entityId},${entityName},${action},${fieldName},${oldValue},${newValue},${changedBy},${ipAddress}\n`
        })

        triggerCSVDownload(csvContent, `dms_machines_history_${Date.now()}.csv`)
      }
    } catch (err) {
      console.error('Failed to export history', err)
    }
  }

  const triggerCSVDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight font-heading">Audit Trail</h1>
          <p className="text-slate-400 mt-1">Audit log records of all facility modifications and operations history.</p>
        </div>
        <div>
          <button
            type="button"
            disabled={currentList.length === 0}
            onClick={exportToCSV}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-950 text-slate-300 hover:text-white disabled:text-slate-650 border border-slate-800 hover:border-slate-700 disabled:border-slate-950 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-300 shadow-md shadow-slate-950/20"
          >
            <Download className="h-4.5 w-4.5 text-blue-500" />
            <span>Export to CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-6">
        <button
          onClick={() => handleTabChange('dies')}
          className={`pb-4 text-md font-semibold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === 'dies' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Extrusion Dies</span>
        </button>
        <button
          onClick={() => handleTabChange('machines')}
          className={`pb-4 text-md font-semibold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === 'machines' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Machines & Sets</span>
        </button>
      </div>

      {/* Filters Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tab Specific Filter */}
          {activeTab === 'dies' ? (
            <div>
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Die ID</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search die ID..."
                  value={dieIdInput}
                  onChange={(e) => { setDieIdInput(e.target.value); setPage(1); }}
                  className="pl-9 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm w-full text-slate-200 placeholder-slate-650 transition focus-ring"
                />
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Entity Name</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search name..."
                    value={entityNameInput}
                    onChange={(e) => { setEntityNameInput(e.target.value); setPage(1); }}
                    className="pl-9 pr-4 py-2.5 bg-slate-955/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm w-full text-slate-200 placeholder-slate-650 transition focus-ring"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Entity Type</label>
                <select
                  value={entityTypeInput}
                  onChange={(e) => { setEntityTypeInput(e.target.value); setPage(1); }}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white focus-ring cursor-pointer"
                >
                  <option value="" className="bg-slate-900">All Entities</option>
                  <option value="MACHINE" className="bg-slate-900">Machine</option>
                  <option value="SET" className="bg-slate-900">Set</option>
                  <option value="CATEGORY" className="bg-slate-900">Category</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Action</label>
                <select
                  value={actionInput}
                  onChange={(e) => { setActionInput(e.target.value); setPage(1); }}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-white focus-ring cursor-pointer"
                >
                  <option value="" className="bg-slate-900">All Actions</option>
                  <option value="CREATED" className="bg-slate-900">Created</option>
                  <option value="UPDATED" className="bg-slate-900">Updated</option>
                  <option value="DELETED" className="bg-slate-900">Deleted</option>
                </select>
              </div>
            </>
          )}

          {/* Shared Filters */}
          <div>
            <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Changed By</label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Username..."
                value={userInput}
                onChange={(e) => { setUserInput(e.target.value); setPage(1); }}
                className="pl-9 pr-4 py-2.5 bg-slate-955/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm w-full text-slate-200 placeholder-slate-650 transition focus-ring"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Field Name</label>
            <div className="relative">
              <Filter className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="e.g. status..."
                value={fieldInput}
                onChange={(e) => { setFieldInput(e.target.value); setPage(1); }}
                className="pl-9 pr-4 py-2.5 bg-slate-955/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm w-full text-slate-200 placeholder-slate-650 transition focus-ring"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-800/60 pt-4">
          <div>
            <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="px-4 py-2.5 bg-slate-955/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm w-full text-slate-200 transition [color-scheme:dark] focus-ring"
            />
          </div>

          <div>
            <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="px-4 py-2.5 bg-slate-955/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm w-full text-slate-200 transition [color-scheme:dark] focus-ring"
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {isCurrentLoading ? (
          <div className="p-24 text-center text-slate-400">
            <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="font-semibold text-white">Loading audit logs...</p>
          </div>
        ) : currentError ? (
          <div className="p-20 text-center text-rose-400">
            <p className="font-semibold text-lg">Failed to load audit logs.</p>
            <p className="text-sm text-slate-500 mt-2">{(currentError as Error).message}</p>
          </div>
        ) : currentList.length === 0 ? (
          <div className="p-20 text-center text-slate-500">
            <p className="font-semibold text-lg">No audit log records found</p>
            <p className="text-sm mt-1">Try adjusting the filter criteria or check back later.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                <thead className="bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  {activeTab === 'dies' ? (
                    <tr>
                      <th className="px-6 py-4.5">Timestamp</th>
                      <th className="px-6 py-4.5">Die ID</th>
                      <th className="px-6 py-4.5">Field Changed</th>
                      <th className="px-6 py-4.5">Old Value</th>
                      <th className="px-6 py-4.5">New Value</th>
                      <th className="px-6 py-4.5">Changed By</th>
                      <th className="px-6 py-4.5">IP Address</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-6 py-4.5">Timestamp</th>
                      <th className="px-6 py-4.5">Entity</th>
                      <th className="px-6 py-4.5">Name</th>
                      <th className="px-6 py-4.5">Action</th>
                      <th className="px-6 py-4.5">Field Changed</th>
                      <th className="px-6 py-4.5">Old Value</th>
                      <th className="px-6 py-4.5">New Value</th>
                      <th className="px-6 py-4.5">Changed By</th>
                      <th className="px-6 py-4.5">IP Address</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-800/65 text-slate-300">
                  {activeTab === 'dies' ? (
                    currentList.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-850/15 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-blue-450 font-bold font-mono text-xs">
                          {log.die_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-350">
                          {log.field_name}
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate text-xs text-slate-450" title={log.old_value}>
                          {log.old_value || <span className="text-slate-700 font-mono italic">empty</span>}
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate text-xs text-slate-200" title={log.new_value}>
                          {log.new_value || <span className="text-slate-700 font-mono italic">empty</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-300 font-bold">
                          {log.changed_by_username || 'System'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-500">
                          {log.ip_address || '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    currentList.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-850/15 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs">
                          <span className={`px-2.5 py-0.5 text-xxs font-bold rounded-full border ${
                            log.entity_type === 'MACHINE'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                              : log.entity_type === 'SET'
                              ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {log.entity_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-white font-semibold">
                          {log.entity_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs">
                          <span className={`px-2 py-0.5 text-xxs font-bold rounded ${
                            log.action === 'CREATED'
                              ? 'bg-emerald-500/15 text-emerald-450'
                              : log.action === 'DELETED'
                              ? 'bg-rose-500/15 text-rose-450'
                              : 'bg-amber-500/15 text-amber-450'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-350">
                          {log.field_name || '—'}
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate text-xs text-slate-450" title={log.old_value}>
                          {log.old_value || '—'}
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate text-xs text-slate-200" title={log.new_value}>
                          {log.new_value || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-300 font-bold">
                          {log.changed_by_username || 'System'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-500">
                          {log.ip_address || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4.5 border-t border-slate-800 bg-slate-950/20">
                <span className="text-xs text-slate-400 font-medium">
                  Showing page <span className="font-semibold text-slate-200">{page}</span> of{' '}
                  <span className="font-semibold text-slate-200">{totalPages}</span> ({count} records)
                </span>
                <div className="flex items-center space-x-2.5">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-950 text-slate-300 disabled:text-slate-650 border border-slate-750 disabled:border-transparent rounded-xl transition"
                  >
                    <ArrowLeft className="h-4.5 w-4.5" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-950 text-slate-300 disabled:text-slate-650 border border-slate-750 disabled:border-transparent rounded-xl transition"
                  >
                    <ArrowRight className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
