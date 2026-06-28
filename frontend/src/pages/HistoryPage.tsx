import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApi, useDebounce } from '../App'
import { Search, User, Filter, ArrowLeft, ArrowRight, Download } from 'lucide-react'

export function HistoryPage() {
  const { request } = useApi()
  
  // Filter States
  const [dieIdInput, setDieIdInput] = useState('')
  const [userInput, setUserInput] = useState('')
  const [fieldInput, setFieldInput] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)

  const debouncedDieId = useDebounce(dieIdInput, 300)
  const debouncedUser = useDebounce(userInput, 300)
  const debouncedField = useDebounce(fieldInput, 300)

  // React Query Fetcher
  const { data: historyData, isLoading, error } = useQuery({
    queryKey: ['dieHistory', debouncedDieId, debouncedUser, debouncedField, fromDate, toDate, page],
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

  const historyList = historyData?.results || []
  const count = historyData?.count || 0
  const totalPages = Math.ceil(count / 25)

  // CSV Export
  const exportToCSV = async () => {
    try {
      const params = new URLSearchParams()
      if (debouncedDieId) params.append('die_id', debouncedDieId)
      if (debouncedUser) params.append('user', debouncedUser)
      if (debouncedField) params.append('field', debouncedField)
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)
      params.append('page_size', '10000') // fetch all matching up to 10k

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

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `dms_die_history_${Date.now()}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Failed to export history', err)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Audit Trail</h1>
          <p className="text-slate-400 mt-1">Audit log records of all precision extrusion die modifications.</p>
        </div>
        <div>
          <button
            type="button"
            disabled={historyList.length === 0}
            onClick={exportToCSV}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-950 text-slate-300 hover:text-white disabled:text-slate-650 border border-slate-800 hover:border-slate-700 disabled:border-slate-950 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-md"
          >
            <Download className="h-4.5 w-4.5 text-blue-500" />
            <span>Export to CSV</span>
          </button>
        </div>
      </div>

      {/* Filters Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Die ID</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search die id..."
              value={dieIdInput}
              onChange={(e) => { setDieIdInput(e.target.value); setPage(1); }}
              className="pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm w-full text-slate-200 placeholder-slate-600 transition"
            />
          </div>
        </div>

        <div>
          <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Changed By</label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Username..."
              value={userInput}
              onChange={(e) => { setUserInput(e.target.value); setPage(1); }}
              className="pl-9 pr-4 py-2 bg-slate-955/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm w-full text-slate-200 placeholder-slate-600 transition"
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
              className="pl-9 pr-4 py-2 bg-slate-955/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm w-full text-slate-200 placeholder-slate-600 transition"
            />
          </div>
        </div>

        <div>
          <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">From Date</label>
          <div className="relative">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="px-4 py-2 bg-slate-955/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm w-full text-slate-200 transition [color-scheme:dark]"
            />
          </div>
        </div>

        <div>
          <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">To Date</label>
          <div className="relative">
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="px-4 py-2 bg-slate-955/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm w-full text-slate-200 transition [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-20 text-center text-slate-400">
            <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="font-semibold">Loading audit logs...</p>
          </div>
        ) : error ? (
          <div className="p-20 text-center text-rose-450">
            <p className="font-semibold">Failed to load audit logs.</p>
            <p className="text-sm text-slate-500 mt-2">{(error as Error).message}</p>
          </div>
        ) : historyList.length === 0 ? (
          <div className="p-20 text-center text-slate-500">
            <p className="font-semibold text-lg">No audit log records found</p>
            <p className="text-sm mt-1">Try adjusting the filter criteria.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                <thead className="bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Die ID</th>
                    <th className="px-6 py-4">Field Changed</th>
                    <th className="px-6 py-4">Old Value</th>
                    <th className="px-6 py-4">New Value</th>
                    <th className="px-6 py-4">Changed By</th>
                    <th className="px-6 py-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {historyList.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-950/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-blue-450 font-semibold font-mono text-xs">
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
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-300 font-semibold">
                        {log.changed_by_username || 'System'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-500">
                        {log.ip_address || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/80 bg-slate-950/20">
                <span className="text-xs text-slate-400 font-medium">
                  Showing page <span className="font-semibold text-slate-200">{page}</span> of{' '}
                  <span className="font-semibold text-slate-200">{totalPages}</span> ({count} records)
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-950 text-slate-300 disabled:text-slate-650 border border-slate-700 disabled:border-transparent rounded-lg transition"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-950 text-slate-300 disabled:text-slate-650 border border-slate-700 disabled:border-transparent rounded-lg transition"
                  >
                    <ArrowRight className="h-4 w-4" />
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
