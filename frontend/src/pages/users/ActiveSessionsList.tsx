import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldAlert, Trash2, Clock, CheckCircle, Info } from 'lucide-react'
import { useApi } from '../../hooks/useApi'

export function ActiveSessionsList() {
  const { request } = useApi()
  const queryClient = useQueryClient()

  // Fetch all active sessions
  const { data: sessions = [], isLoading, error } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: () => request('/api/active-sessions/')
  })

  // Mutation to delete/revoke session
  const revokeMutation = useMutation({
    mutationFn: (id: number) => request(`/api/active-sessions/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      // Invalidate both active sessions and audit logs query keys
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] })
      queryClient.invalidateQueries({ queryKey: ['sessionActivityLogs'] })
    }
  })

  const handleRevoke = (id: number, username: string) => {
    if (confirm(`Are you sure you want to force log out user "${username}"?`)) {
      revokeMutation.mutate(id)
    }
  }

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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
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
                  <tr key={sess.id} className="hover:bg-slate-850/20 transition-colors duration-250">
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
