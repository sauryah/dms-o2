import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Clock, Info, Zap, Monitor, Smartphone, ShieldAlert } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'

export function ActiveSessionsList() {
  const { request } = useApi()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Set<number>>(new Set())

  // Dialog States
  const [sessionToRevoke, setSessionToRevoke] = useState<{ id: number; username: string } | null>(null)
  const [showRevokeAllConfirm, setShowRevokeAllConfirm] = useState(false)
  const [showBulkRevokeConfirm, setShowBulkRevokeConfirm] = useState(false)

  const { data: sessions = [], isLoading, error } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: () => request('/api/active-sessions/')
  })

  const revokeMutation = useMutation({
    mutationFn: (id: number) => request(`/api/active-sessions/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] })
      queryClient.invalidateQueries({ queryKey: ['sessionActivityLogs'] })
      setSessionToRevoke(null)
    }
  })

  const clearAllMutation = useMutation({
    mutationFn: () => request('/api/active-sessions/all/', { method: 'DELETE' }),
    onSuccess: () => {
      setSelected(new Set())
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] })
      queryClient.invalidateQueries({ queryKey: ['sessionActivityLogs'] })
      setShowRevokeAllConfirm(false)
    }
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => request('/api/active-sessions/bulk/', { method: 'DELETE', body: { ids } }),
    onSuccess: () => {
      setSelected(new Set())
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] })
      queryClient.invalidateQueries({ queryKey: ['sessionActivityLogs'] })
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
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_8px_rgba(168,85,247,0.05)]'
      case 'ADMIN':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.05)]'
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
    }
  }

  const parseUserAgent = (uaString: string) => {
    if (!uaString) return { deviceType: 'desktop', label: 'Unknown Client' }
    const ua = uaString.toLowerCase()
    
    let os = 'Other OS'
    if (ua.includes('windows')) os = 'Windows'
    else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS'
    else if (ua.includes('linux')) os = 'Linux'
    else if (ua.includes('android')) os = 'Android'
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'

    let browser = 'Browser'
    if (ua.includes('firefox')) browser = 'Firefox'
    else if (ua.includes('chrome') && !ua.includes('chromium')) browser = 'Chrome'
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari'
    else if (ua.includes('edge') || ua.includes('edg')) browser = 'Edge'
    
    const isMobile = ua.includes('mobi') || ua.includes('android') || ua.includes('iphone')

    return {
      deviceType: isMobile ? 'mobile' : 'desktop',
      label: `${browser} on ${os}`
    }
  }

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <div className="h-4 w-32 bg-slate-800 rounded animate-pulse" />
            <div className="h-8 w-24 bg-slate-800 rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="h-4 w-4 bg-slate-800 rounded animate-pulse" />
                <div className="h-10 w-full bg-slate-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8 shadow-lg max-w-xl mx-auto">
          <ShieldAlert className="h-10 w-10 text-rose-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Query Failure</h3>
          <p className="text-rose-450 font-mono text-sm">{(error as any).message}</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 shadow-xl max-w-lg mx-auto select-none">
          <Info className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-1">No Active Sessions</h3>
          <p className="text-slate-400 text-sm">No connected client devices are registered at this time.</p>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
          {/* Action Header */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 px-6 py-4 bg-slate-950/40 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-350 font-mono">
                {sessions.length} Client Session{sessions.length !== 1 ? 's' : ''}
              </span>
              {selected.size > 0 && (
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full animate-pulse">
                  {selected.size} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <AnimatePresence>
                {selected.size > 0 && (
                  <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-500/30 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear {selected.size} Selected</span>
                  </motion.button>
                )}
              </AnimatePresence>
              <button
                onClick={handleClearAll}
                disabled={clearAllMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/25 text-rose-450 hover:text-rose-300 border border-rose-500/20 hover:border-rose-500/30 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Force Logout All</span>
              </button>
            </div>
          </div>

          {/* Sticky Table Wrapper */}
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md text-slate-450 text-xs font-bold uppercase tracking-wider select-none">
                  <th className="py-4 px-6 w-12">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected }}
                      onChange={toggleSelectAll}
                      className="h-4.5 w-4.5 rounded border-slate-700 bg-slate-950 text-blue-500 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-4 px-6 font-mono">User ID</th>
                  <th className="py-4 px-6 font-mono">Role</th>
                  <th className="py-4 px-6 font-mono">Login Time</th>
                  <th className="py-4 px-6 font-mono">Last Seen</th>
                  <th className="py-4 px-6 font-mono">IP Address</th>
                  <th className="py-4 px-6 font-mono">Device Environment</th>
                  <th className="py-4 px-6 font-mono text-right">Revoke</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {sessions.map((sess: any) => {
                  const client = parseUserAgent(sess.device)
                  const isSessSelected = selected.has(sess.id)
                  
                  return (
                    <tr
                      key={sess.id}
                      className={`group hover:bg-slate-850/25 transition-all duration-150 ${
                        isSessSelected ? 'bg-blue-500/[0.03]' : ''
                      }`}
                    >
                      <td className="py-4 px-6">
                        <input
                          type="checkbox"
                          checked={isSessSelected}
                          onChange={() => toggleSelect(sess.id)}
                          className="h-4.5 w-4.5 rounded border-slate-700 bg-slate-950 text-blue-500 focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="py-4 px-6 font-bold text-white font-mono">
                        {sess.username}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${getRoleBadge(sess.role)}`}>
                          {sess.role}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-300 text-xs font-mono">
                        {new Date(sess.created_at).toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-slate-350 text-xs font-mono">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="h-3.5 w-3.5 text-blue-450" />
                          <span>{new Date(sess.last_seen).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-400 text-xs font-mono">
                        {sess.ip_address || '—'}
                      </td>
                      <td className="py-4 px-6 text-slate-300 text-xs">
                        <div className="flex items-center space-x-2" title={sess.device || 'Unknown'}>
                          {client.deviceType === 'mobile' ? (
                            <Smartphone className="h-4 w-4 text-slate-500 shrink-0" />
                          ) : (
                            <Monitor className="h-4 w-4 text-slate-500 shrink-0" />
                          )}
                          <span className="truncate max-w-[200px] font-medium">{client.label}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleRevoke(sess.id, sess.username)}
                          disabled={revokeMutation.isPending}
                          className="p-2 bg-slate-950/20 group-hover:bg-rose-500/10 text-slate-500 group-hover:text-rose-450 border border-slate-800/80 group-hover:border-rose-500/20 rounded-xl transition-all duration-200 disabled:opacity-40 cursor-pointer"
                          title="Force log out device"
                        >
                          <Trash2 className="h-4 w-4" />
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
        isOpen={!!sessionToRevoke}
        title="Revoke Session"
        message={`Are you sure you want to force log out user "${sessionToRevoke?.username}"? Their active login session will be immediately terminated.`}
        confirmText="Revoke Session"
        isDestructive={true}
        onConfirm={() => {
          if (sessionToRevoke) {
            revokeMutation.mutate(sessionToRevoke.id)
          }
        }}
        onCancel={() => setSessionToRevoke(null)}
      />

      <ConfirmDialog
        isOpen={showRevokeAllConfirm}
        title="Revoke All Sessions"
        message={`CRITICAL: Are you sure you want to terminate ALL ${sessions.length} active sessions? This will disconnect all logged-in users.`}
        confirmText="Force Logout All"
        isDestructive={true}
        onConfirm={() => {
          clearAllMutation.mutate()
        }}
        onCancel={() => setShowRevokeAllConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showBulkRevokeConfirm}
        title="Revoke Selected Sessions"
        message={`Are you sure you want to force log out the ${selected.size} selected session(s)?`}
        confirmText="Logout Selected"
        isDestructive={true}
        onConfirm={() => {
          bulkDeleteMutation.mutate(Array.from(selected))
        }}
        onCancel={() => setShowBulkRevokeConfirm(false)}
      />
    </div>
  )
}

