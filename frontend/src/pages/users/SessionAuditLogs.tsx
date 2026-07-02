import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Search, Clock, ShieldAlert, CheckCircle, LogOut, Info } from 'lucide-react'
import { useApi } from '../../hooks/useApi'

export function SessionAuditLogs() {
  const { request } = useApi()
  const [page, setPage] = useState(1)
  const [usernameSearch, setUsernameSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['sessionActivityLogs', page, usernameSearch, actionFilter],
    queryFn: () => {
      let url = `/api/activity-logs/?page=${page}`
      if (usernameSearch.trim()) {
        url += `&username=${encodeURIComponent(usernameSearch.trim())}`
      }
      if (actionFilter) {
        url += `&action=${encodeURIComponent(actionFilter)}`
      }
      return request(url)
    }
  })

  const logs = data?.results || []
  const count = data?.count || 0
  const totalPages = Math.ceil(count / 100) // Default Page Size in settings is 100

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsernameSearch(e.target.value)
    setPage(1)
  }

  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActionFilter(e.target.value)
    setPage(1)
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
            <CheckCircle className="h-3 w-3" />
            <span>Login</span>
          </span>
        )
      case 'LOGOUT':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 w-fit">
            <LogOut className="h-3 w-3" />
            <span>Logout</span>
          </span>
        )
      case 'FAILED_LOGIN':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 w-fit animate-pulse">
            <ShieldAlert className="h-3 w-3" />
            <span>Failed Login</span>
          </span>
        )
      case 'SESSION_EXPIRED':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 w-fit">
            <Clock className="h-3 w-3" />
            <span>Expired</span>
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 w-fit">
            {action}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters & Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/40 p-4 border border-slate-800 rounded-2xl">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search by username..."
            value={usernameSearch}
            onChange={handleSearchChange}
            className="w-full glass-input rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus-ring"
          />
        </div>

        <div>
          <select
            value={actionFilter}
            onChange={handleActionChange}
            className="w-full glass-input rounded-xl px-4 py-2 text-sm text-white focus-ring cursor-pointer"
          >
            <option value="" className="bg-slate-900">All Actions</option>
            <option value="LOGIN" className="bg-slate-900">Login</option>
            <option value="LOGOUT" className="bg-slate-900">Logout</option>
            <option value="FAILED_LOGIN" className="bg-slate-900">Failed Login</option>
            <option value="SESSION_EXPIRED" className="bg-slate-900">Session Expired</option>
          </select>
        </div>

        <div className="flex justify-end items-center">
          <button
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-rose-500/10 border border-rose-500/20 rounded-xl p-8">
          <p className="text-rose-400 font-semibold">Error: {(error as any).message}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 border border-slate-850 rounded-2xl p-8">
          <Info className="h-10 w-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No session audit logs match the current search or filters.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4.5 px-6">User</th>
                  <th className="py-4.5 px-6">Event</th>
                  <th className="py-4.5 px-6">Timestamp</th>
                  <th className="py-4.5 px-6">IP Address</th>
                  <th className="py-4.5 px-6">Device / User Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-850/20 transition-colors duration-250">
                    <td className="py-4 px-6 font-bold text-white">
                      {log.username}
                    </td>
                    <td className="py-4 px-6">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-4 px-6 text-slate-300 text-sm">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-slate-400 text-sm font-mono">
                      {log.ip_address || '—'}
                    </td>
                    <td className="py-4 px-6 text-slate-400 text-xs truncate max-w-[280px]" title={log.device}>
                      {log.device || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4.5 border-t border-slate-800 bg-slate-955/20">
              <div className="text-sm text-slate-400">
                Showing page <span className="font-semibold text-white">{page}</span> of <span className="font-semibold text-white">{totalPages}</span> ({count} logs total)
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="px-4.5 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="px-4.5 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
