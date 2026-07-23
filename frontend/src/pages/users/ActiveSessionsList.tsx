import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Clock, Info, Zap } from 'lucide-react'
import { useApi } from '../../hooks/useApi'

export function ActiveSessionsList() {
  const { request } = useApi()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const { data: sessions = [], isLoading, error } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: () => request('/api/active-sessions/')
  })

  const revokeMutation = useMutation({
    mutationFn: (id: number) => request(`/api/active-sessions/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] })
      queryClient.invalidateQueries({ queryKey: ['sessionActivityLogs'] })
    }
  })

  const clearAllMutation = useMutation({
    mutationFn: () => request('/api/active-sessions/all/', { method: 'DELETE' }),
    onSuccess: () => {
      setSelected(new Set())
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] })
      queryClient.invalidateQueries({ queryKey: ['sessionActivityLogs'] })
    }
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => request('/api/active-sessions/bulk/', { method: 'DELETE', body: { ids } }),
    onSuccess: () => {
      setSelected(new Set())
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] })
      queryClient.invalidateQueries({ queryKey: ['sessionActivityLogs'] })
    }
  })

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === sessions.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(sessions.map((s: any) => s.id)))
    }
  }

  const handleRevoke = (id: number, username: string) => {
    if (confirm(`Are you sure you want to force log out user "${username}"?`)) {
      revokeMutation.mutate(id)
    }
  }

  const handleClearAll = () => {
    if (confirm(`Are you sure you want to force log out ALL ${sessions.length} active session(s)? This cannot be undone.`)) {
      clearAllMutation.mutate()
    }
  }

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to force log out ${selected.size} selected session(s)?`)) {
      bulkDeleteMutation.mutate(Array.from(selected))
    }
  }

  const allSelected = sessions.length > 0 && selected.size === sessions.length
  const someSelected = selected.size > 0 && selected.size < sessions.length

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ROOT':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
      case 'ADMIN':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
    }
  }

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-rose-500/10 border border-rose-500/20 rounded-xl p-8">
          <p className="text-rose-400 font-semibold">Error: {(error as any).message}</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 border border-slate-850 rounded-2xl p-8">
          <Info className="h-10 w-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No active device sessions found.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 bg-slate-950/40 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
              </span>
              {selected.size > 0 && (
                <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  {selected.size} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-500/40 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {bulkDeleteMutation.isPending ? 'Clearing...' : `Clear ${selected.size} Selected`}
                </button>
              )}
              <button
                onClick={handleClearAll}
                disabled={clearAllMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:border-rose-500/40 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-40"
              >
                <Zap className="h-3.5 w-3.5" />
                {clearAllMutation.isPending ? 'Clearing...' : 'Clear All'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4.5 px-6 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected }}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/40 cursor-pointer"
                    />
                  </th>
                  <th className="py-4.5 px-6">User</th>
                  <th className="py-4.5 px-6">Role</th>
                  <th className="py-4.5 px-6">Login Time</th>
                  <th className="py-4.5 px-6">Last Active</th>
                  <th className="py-4.5 px-6">IP Address</th>
                  <th className="py-4.5 px-6">Device info</th>
                  <th className="py-4.5 px-6 text-right">Revoke</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sessions.map((sess: any) => (
                  <tr
                    key={sess.id}
                    className={`hover:bg-slate-850/20 transition-colors duration-250 ${
                      selected.has(sess.id) ? 'bg-blue-500/[0.04]' : ''
                    }`}
                  >
                    <td className="py-4 px-6">
                      <input
                        type="checkbox"
                        checked={selected.has(sess.id)}
                        onChange={() => toggleSelect(sess.id)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/40 cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-6 font-bold text-white">
                      {sess.username}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getRoleBadge(sess.role)}`}>
                        {sess.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-300 text-sm">
                      {new Date(sess.created_at).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-slate-300 text-sm flex items-center space-x-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-400" />
                      <span>{new Date(sess.last_seen).toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-6 text-slate-400 text-sm font-mono">
                      {sess.ip_address || '—'}
                    </td>
                    <td className="py-4 px-6 text-slate-400 text-xs truncate max-w-[240px]" title={sess.device}>
                      {sess.device || '—'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleRevoke(sess.id, sess.username)}
                        disabled={revokeMutation.isPending}
                        className="p-2 hover:bg-rose-500/10 text-rose-500 hover:text-rose-400 rounded-lg transition-all duration-200 disabled:opacity-40"
                        title="Force log out device"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
