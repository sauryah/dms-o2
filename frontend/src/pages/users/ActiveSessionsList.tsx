import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Clock, Info, Zap, Monitor, Smartphone, ShieldAlert } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { parseUserAgent } from '../../utils/parseUserAgent'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { AnimatePresence } from 'framer-motion'

export function ActiveSessionsList() {
  const { request } = useApi()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Set<number>>(new Set())

  // Dialog States
  const [sessionToRevoke, setSessionToRevoke] = useState<{ id: number; username: string } | null>(null)
  const [showRevokeAllConfirm, setShowRevokeAllConfirm] = useState(false)
  const [showBulkRevokeConfirm, setShowBulkRevokeConfirm] = useState(false)
  const [preserveOwn] = useState(true)

  const { data: sessions = [], isLoading, error } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: () => request('/api/active-sessions/')
  })

  const revokeMutation = useMutation({
    mutationFn: (id: number) => request(`/api/active-sessions/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] })
      queryClient.invalidateQueries({ queryKey: ['sessionActivityLogs'] })
      queryClient.invalidateQueries({ queryKey: ['adminCounts'] })
      setSessionToRevoke(null)
    }
  })

  const clearAllMutation = useMutation({
    mutationFn: () => request(`/api/active-sessions/all/?preserve_own=${preserveOwn}`, { method: 'DELETE' }),
    onSuccess: () => {
      setSelected(new Set())
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] })
      queryClient.invalidateQueries({ queryKey: ['sessionActivityLogs'] })
      queryClient.invalidateQueries({ queryKey: ['adminCounts'] })
      setShowRevokeAllConfirm(false)
    }
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => request('/api/active-sessions/bulk/', { 
      method: 'DELETE', 
      body: JSON.stringify({ ids, preserve_own: true }) 
    }),
    onSuccess: () => {
      setSelected(new Set())
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] })
      queryClient.invalidateQueries({ queryKey: ['sessionActivityLogs'] })
      queryClient.invalidateQueries({ queryKey: ['adminCounts'] })
      setShowBulkRevokeConfirm(false)
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
    setSessionToRevoke({ id, username })
  }

  const handleClearAll = () => {
    setShowRevokeAllConfirm(true)
  }

  const handleBulkDelete = () => {
    setShowBulkRevokeConfirm(true)
  }

  const allSelected = sessions.length > 0 && selected.size === sessions.length
  const someSelected = selected.size > 0 && selected.size < sessions.length

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ROOT':
        return 'bg-[#141414] text-purple-400 border border-purple-500/30'
      case 'ADMIN':
        return 'bg-[#141414] text-blue-400 border border-blue-500/30'
      case 'OPERATOR':
        return 'bg-[#141414] text-amber-400 border border-amber-500/30'
      default:
        return 'bg-[#141414] text-[#6b7280] border border-[#2a2a2a]'
    }
  }

  return (
    <div className="space-y-4 font-mono">
      {isLoading ? (
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 overflow-hidden">
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 w-full bg-[#141414] animate-pulse" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-8 bg-[#0f0f0f] border border-red-500/30 rounded-sm p-6 max-w-xl mx-auto">
          <ShieldAlert className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-xs font-bold uppercase text-[#e4e4e4] mb-1">Query Failure</h3>
          <p className="text-red-400 font-mono text-xs">{(error as any).message}</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-6 max-w-md mx-auto select-none">
          <Info className="h-8 w-8 text-[#404040] mx-auto mb-2" />
          <h3 className="text-xs font-bold uppercase text-[#e4e4e4] mb-1">No Active Sessions</h3>
          <p className="text-[#6b7280] text-xs">No connected client devices are registered at this time.</p>
        </div>
      ) : (
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm overflow-hidden font-mono">
          {/* Action Header */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 py-2.5 bg-[#0a0a0a] border-b border-[#1a1a1a]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#e4e4e4] uppercase">
                01 ACTIVE SESSIONS ({sessions.length})
              </span>
              {selected.size > 0 && (
                <span className="text-[10px] font-mono text-amber-400 bg-[#141414] border border-amber-500/30 px-1.5 py-0.2 rounded-sm uppercase">
                  {selected.size} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {selected.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteMutation.isPending}
                    className="flex items-center gap-1 px-3 py-1 bg-[#141414] hover:bg-[#1f1f1f] text-amber-400 border border-amber-500/40 rounded-sm text-xs font-mono uppercase transition cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear ({selected.size})</span>
                  </button>
                )}
              </AnimatePresence>
              <button
                onClick={handleClearAll}
                disabled={clearAllMutation.isPending}
                className="flex items-center gap-1 px-3 py-1 bg-[#141414] hover:bg-[#1f1f1f] text-red-400 border border-red-500/40 rounded-sm text-xs font-mono uppercase transition cursor-pointer"
              >
                <Zap className="h-3 w-3" />
                <span>Force Logout All</span>
              </button>
            </div>
          </div>

          {/* Sticky Table Wrapper */}
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-[#1a1a1a] bg-[#0a0a0a] text-[#6b7280] uppercase tracking-wider select-none">
                  <th className="py-2.5 px-4 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected }}
                      onChange={toggleSelectAll}
                      className="rounded-none border-[#2a2a2a] bg-[#0a0a0a] text-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-4">User ID</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Login Time</th>
                  <th className="py-2.5 px-4">Last Seen</th>
                  <th className="py-2.5 px-4">IP Address</th>
                  <th className="py-2.5 px-4">Device</th>
                  <th className="py-2.5 px-4 text-right">Revoke</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a] text-[#e4e4e4]">
                {sessions.map((sess: any) => {
                  const client = parseUserAgent(sess.device)
                  const isSessSelected = selected.has(sess.id)
                  
                  return (
                    <tr
                      key={sess.id}
                      className={`hover:bg-[#141414] transition-colors ${
                        isSessSelected ? 'bg-[#141414]' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4">
                        <input
                          type="checkbox"
                          checked={isSessSelected}
                          onChange={() => toggleSelect(sess.id)}
                          className="rounded-none border-[#2a2a2a] bg-[#0a0a0a] text-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-4 font-bold text-[#e4e4e4]">
                        {sess.username}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-1.5 py-0.2 text-[9px] font-mono uppercase rounded-sm border ${getRoleBadge(sess.role)}`}>
                          {sess.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[#6b7280] tabular-nums">
                        {new Date(sess.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-[#6b7280] tabular-nums">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-blue-400" />
                          <span>{new Date(sess.last_seen).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-[#6b7280] tabular-nums">
                        {sess.ip_address || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-[#e4e4e4]">
                        <div className="flex items-center space-x-1.5" title={sess.device || 'Unknown'}>
                          {client.deviceType === 'mobile' ? (
                            <Smartphone className="h-3.5 w-3.5 text-[#6b7280] shrink-0" />
                          ) : (
                            <Monitor className="h-3.5 w-3.5 text-[#6b7280] shrink-0" />
                          )}
                          <span className="truncate max-w-[180px]">{client.label}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleRevoke(sess.id, sess.username)}
                          disabled={revokeMutation.isPending}
                          className="p-1 bg-[#141414] hover:bg-[#1f1f1f] text-[#6b7280] hover:text-red-400 border border-[#2a2a2a] rounded-sm transition cursor-pointer"
                          title="Force log out device"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={!!sessionToRevoke}
        title="Revoke Session"
        message={`Are you sure you want to force log out user "${sessionToRevoke?.username}"? Their active login session will be immediately terminated.`}
        confirmLabel="Revoke Session"
        danger={true}
        onConfirm={() => {
          if (sessionToRevoke) {
            revokeMutation.mutate(sessionToRevoke.id)
          }
        }}
        onCancel={() => setSessionToRevoke(null)}
      />

      <ConfirmDialog
        open={showRevokeAllConfirm}
        title="Revoke All Sessions"
        message={`Are you sure you want to terminate ALL ${sessions.length} active sessions? This will disconnect all logged-in users.`}
        confirmLabel="Force Logout All"
        danger={true}
        onConfirm={() => {
          clearAllMutation.mutate()
        }}
        onCancel={() => setShowRevokeAllConfirm(false)}
      />

      <ConfirmDialog
        open={showBulkRevokeConfirm}
        title="Revoke Selected Sessions"
        message={`Are you sure you want to force log out the ${selected.size} selected session(s)?`}
        confirmLabel="Logout Selected"
        danger={true}
        onConfirm={() => {
          bulkDeleteMutation.mutate(Array.from(selected))
        }}
        onCancel={() => setShowBulkRevokeConfirm(false)}
      />
    </div>
  )
}
