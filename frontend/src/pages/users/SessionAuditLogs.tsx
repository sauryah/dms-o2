import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Search, Clock, ShieldAlert, LogOut, Info, Monitor, Smartphone, Download } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { motion } from 'framer-motion'

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
      return request(url, { keepMetadata: true })
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

  // Helper to group flat logs into unified user sessions
  const groupLogsIntoSessions = (rawLogs: any[]) => {
    // Sort chronologically ascending (oldest first) to build sessions in order
    const sortedLogs = [...rawLogs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const sessions: any[] = [];
    const openSessionsByUser: { [username: string]: any } = {};

    sortedLogs.forEach((log) => {
      const user = log.username;

      if (log.action === 'LOGIN') {
        // Close previous open session as disconnected if another login starts
        if (openSessionsByUser[user]) {
          const prev = openSessionsByUser[user];
          prev.logout_time = log.timestamp;
          prev.status = 'CLOSED'; 
          sessions.push(prev);
        }
        
        // Start new session
        openSessionsByUser[user] = {
          id: log.id,
          username: user,
          login_time: log.timestamp,
          logout_time: null,
          status: 'ACTIVE',
          ip_address: log.ip_address,
          device: log.device,
        };
      } 
      else if (log.action === 'LOGOUT' || log.action === 'SESSION_EXPIRED') {
        const statusLabel = log.action === 'SESSION_EXPIRED' ? 'EXPIRED' : 'LOGGED_OUT';
        
        if (openSessionsByUser[user]) {
          const session = openSessionsByUser[user];
          session.logout_time = log.timestamp;
          session.status = statusLabel;
          if (log.ip_address) session.ip_address = log.ip_address;
          if (log.device) session.device = log.device;
          sessions.push(session);
          delete openSessionsByUser[user];
        } else {
          // If logout event occurs without login event in current batch, render partial session
          sessions.push({
            id: log.id,
            username: user,
            login_time: null,
            logout_time: log.timestamp,
            status: statusLabel,
            ip_address: log.ip_address,
            device: log.device,
          });
        }
      } 
      else if (log.action === 'FAILED_LOGIN') {
        // Failed logins don't group into sessions, render as individual security alerts
        sessions.push({
          id: log.id,
          username: user,
          login_time: null,
          logout_time: log.timestamp,
          status: 'FAILED',
          ip_address: log.ip_address,
          device: log.device,
        });
      }
    });

    // Collect any remaining active sessions
    Object.keys(openSessionsByUser).forEach((user) => {
      sessions.push(openSessionsByUser[user]);
    });

    // Sort back to descending (newest activity first)
    return sessions.sort((a, b) => {
      const timeA = new Date(a.logout_time || a.login_time).getTime();
      const timeB = new Date(b.logout_time || b.login_time).getTime();
      return timeB - timeA;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg bg-emerald-500/10 border border-emerald-500/20 w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Active Now</span>
          </span>
        )
      case 'LOGGED_OUT':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg bg-slate-800 text-slate-400 border border-slate-700/80 w-fit">
            <LogOut className="h-3 w-3 text-slate-400" />
            <span>Logged Out</span>
          </span>
        )
      case 'FAILED':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg bg-rose-500/10 border border-rose-500/20 w-fit animate-pulse">
            <ShieldAlert className="h-3 w-3" />
            <span>Failed Attempt</span>
          </span>
        )
      case 'EXPIRED':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 w-fit">
            <Clock className="h-3 w-3 text-amber-500" />
            <span>Expired</span>
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg bg-slate-900 text-slate-500 border border-slate-800 w-fit">
            Closed
          </span>
        )
    }
  }

  const getDuration = (login: string | null, logout: string | null, status: string) => {
    if (!login) return '—';
    const start = new Date(login).getTime();
    const end = status === 'ACTIVE' ? new Date().getTime() : (logout ? new Date(logout).getTime() : null);
    if (!end) return '—';
    
    const diffMs = end - start;
    if (diffMs < 0) return '0m';
    const diffMins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
  };

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

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return <span>{text}</span>
    const regex = new RegExp(`(${query.replace(/[/\\^$*+?.()|[\]{}-]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return (
      <span>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <mark key={i} className="bg-blue-500/30 text-blue-200 rounded px-0.5 font-bold normal-case">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    )
  }

  const handleExportCSV = () => {
    if (groupedSessions.length === 0) return
    const headers = ['Username', 'Status', 'Session Start', 'Session End', 'Duration', 'IP Address', 'Device Environment']
    const rows = groupedSessions.map((session: any) => {
      const loginStr = session.login_time ? new Date(session.login_time).toLocaleString().replace(/"/g, '""') : '—'
      const logoutStr = session.status === 'ACTIVE' 
        ? 'Active Now' 
        : (session.logout_time ? new Date(session.logout_time).toLocaleString().replace(/"/g, '""') : '—')
      const duration = getDuration ? getDuration(session.login_time, session.logout_time, session.status) : '—'
      const client = parseUserAgent ? parseUserAgent(session.device) : { label: 'Unknown' }
      
      const usernameSafe = (session.username || '').replace(/"/g, '""')
      const statusSafe = (session.status || '').replace(/"/g, '""')
      const durationSafe = (duration || '').replace(/"/g, '""')
      const ipSafe = (session.ip_address || '—').replace(/"/g, '""')
      const clientSafe = (client.label || '').replace(/"/g, '""')

      return [
        `"${usernameSafe}"`,
        `"${statusSafe}"`,
        `"${loginStr}"`,
        `"${logoutStr}"`,
        `"${durationSafe}"`,
        `"${ipSafe}"`,
        `"${clientSafe}"`
      ]
    })
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const timestamp = new Date().toISOString().split('T')[0]
    link.download = `security_audit_logs_${timestamp}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const groupedSessions = groupLogsIntoSessions(logs);

  return (
    <div className="space-y-6 font-sans">
      {/* Filters & Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/60 p-4 border border-slate-800/80 rounded-2xl backdrop-blur-sm select-none">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search by username..."
            value={usernameSearch}
            onChange={handleSearchChange}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-950/20 transition-all font-mono"
          />
        </div>

        <div>
          <select
            value={actionFilter}
            onChange={handleActionChange}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-950/20 transition-all cursor-pointer font-mono"
          >
            <option value="" className="bg-slate-950">All Actions Filter</option>
            <option value="LOGIN" className="bg-slate-950">Login Sessions Only</option>
            <option value="LOGOUT" className="bg-slate-950">Logged Out Only</option>
            <option value="FAILED_LOGIN" className="bg-slate-950">Failed Logins Only</option>
            <option value="SESSION_EXPIRED" className="bg-slate-950">Expirations Only</option>
          </select>
        </div>

        <div className="flex justify-end items-center space-x-2">
          <button
            onClick={handleExportCSV}
            disabled={groupedSessions.length === 0}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-900/40 text-white disabled:text-slate-500 border border-blue-500/20 disabled:border-slate-800/80 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
            title="Download current log view as CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="font-mono">Export CSV</span>
          </button>
          <button
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="flex items-center space-x-2 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-800/85 px-4 py-2.5 rounded-xl text-xs font-bold transition disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-blue-400' : ''}`} />
            <span className="font-mono">Sync Logs</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <div className="h-4 w-40 bg-slate-800 rounded animate-pulse" />
            <div className="h-6 w-28 bg-slate-800 rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 w-full bg-slate-800 rounded animate-pulse" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8 max-w-xl mx-auto">
          <ShieldAlert className="h-10 w-10 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Query Failure</h3>
          <p className="text-rose-400 font-mono text-sm">{(error as any).message}</p>
        </div>
      ) : groupedSessions.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 max-w-md mx-auto select-none">
          <Info className="h-10 w-10 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-1 font-mono">No Audit Logs</h3>
          <p className="text-slate-400 text-sm">No user session activities match the query filter criteria.</p>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md text-slate-400 text-xs font-bold uppercase tracking-wider select-none">
                  <th className="py-4 px-6 font-mono">User Identity</th>
                  <th className="py-4 px-6 font-mono">Session State</th>
                  <th className="py-4 px-6 font-mono">Session Start</th>
                  <th className="py-4 px-6 font-mono">Session End</th>
                  <th className="py-4 px-6 font-mono">Duration</th>
                  <th className="py-4 px-6 font-mono">Client Details</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono text-xs text-slate-300 select-none">
                {groupedSessions.map((session: any) => {
                  const loginStr = session.login_time ? new Date(session.login_time).toLocaleString() : '—'
                  const logoutStr = session.status === 'ACTIVE' 
                    ? 'Active Now' 
                    : (session.logout_time ? new Date(session.logout_time).toLocaleString() : '—')
                  const duration = getDuration(session.login_time, session.logout_time, session.status)
                  const client = parseUserAgent(session.device)

                  return (
                    <tr key={session.id} className="transition-colors duration-150">
                      <td className="py-3.5 px-6 font-semibold text-slate-200">
                        {highlightMatch(session.username, usernameSearch)}
                      </td>
                      <td className="py-3.5 px-6">
                        {getStatusBadge(session.status)}
                      </td>
                      <td className="py-3.5 px-6 text-slate-400">
                        {loginStr}
                      </td>
                      <td className="py-3.5 px-6 text-slate-400">
                        <span className={session.status === 'ACTIVE' ? ' font-bold' : ''}>
                          {logoutStr}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-slate-300 font-bold">
                        {duration}
                      </td>
                      <td className="py-3.5 px-6" title={`${session.ip_address || '—'} | ${session.device || '—'}`}>
                        <span className="text-slate-300 font-bold block">{session.ip_address || '—'}</span>
                        <span className="text-[10px] text-slate-500 font-sans flex items-center space-x-1.5 mt-1 select-none">
                          {client.deviceType === 'mobile' ? (
                            <Smartphone className="h-3 w-3 shrink-0" />
                          ) : (
                            <Monitor className="h-3 w-3 shrink-0" />
                          )}
                          <span className="truncate max-w-[200px]">{client.label}</span>
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60 text-xs select-none">
              <div className="text-slate-400 font-mono">
                Showing page <span className="font-semibold text-white">{page}</span> of <span className="font-semibold text-white">{totalPages}</span> (<span className="text-slate-300">{count}</span> entries)
              </div>
              <div className="flex space-x-2 font-mono">
                <button
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="px-3.5 py-2 bg-slate-950 text-slate-300 hover:text-white border border-slate-800 rounded-xl font-bold transition disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-900 cursor-pointer"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="px-3.5 py-2 bg-slate-950 text-slate-300 hover:text-white border border-slate-800 rounded-xl font-bold transition disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-900 cursor-pointer"
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

