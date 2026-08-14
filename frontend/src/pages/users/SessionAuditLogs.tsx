import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Search, Clock, ShieldAlert, LogOut, Info, Monitor, Smartphone, Download } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { parseUserAgent } from '../../utils/parseUserAgent'

export function SessionAuditLogs() {
  const { request } = useApi()
  const [page, setPage] = useState(1)
  const [usernameSearch, setUsernameSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['sessionActivityLogs', page, usernameSearch, actionFilter, dateFrom, dateTo],
    queryFn: () => {
      let url = `/api/activity-logs/?page=${page}`
      if (usernameSearch.trim()) {
        url += `&username=${encodeURIComponent(usernameSearch.trim())}`
      }
      if (actionFilter) {
        url += `&action=${encodeURIComponent(actionFilter)}`
      }
      if (dateFrom) {
        url += `&date_from=${encodeURIComponent(dateFrom)}`
      }
      if (dateTo) {
        url += `&date_to=${encodeURIComponent(dateTo)}`
      }
      return request(url, { keepMetadata: true })
    }
  })

  const logs = data?.results || []
  const count = data?.count || 0
  const totalPages = Math.ceil(count / 100)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsernameSearch(e.target.value)
    setPage(1)
  }

  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActionFilter(e.target.value)
    setPage(1)
  }

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFrom(e.target.value)
    setPage(1)
  }

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateTo(e.target.value)
    setPage(1)
  }

  const clearFilters = () => {
    setUsernameSearch('')
    setActionFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  // Helper to group flat logs into unified user sessions
  const groupLogsIntoSessions = (rawLogs: any[]) => {
    const sortedLogs = [...rawLogs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const sessions: any[] = [];
    const openSessionsByUser: { [username: string]: any } = {};

    sortedLogs.forEach((log) => {
      const user = log.username;

      if (log.action === 'LOGIN') {
        if (openSessionsByUser[user]) {
          const prev = openSessionsByUser[user];
          prev.logout_time = log.timestamp;
          prev.status = 'CLOSED'; 
          sessions.push(prev);
        }
        
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

    Object.keys(openSessionsByUser).forEach((user) => {
      sessions.push(openSessionsByUser[user]);
    });

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
          <span className="flex items-center space-x-1 px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase rounded-sm bg-[#141414] text-emerald-400 border border-emerald-500/30 w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Active</span>
          </span>
        )
      case 'LOGGED_OUT':
        return (
          <span className="flex items-center space-x-1 px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase rounded-sm bg-[#141414] text-[#6b7280] border border-[#2a2a2a] w-fit">
            <LogOut className="h-2.5 w-2.5" />
            <span>Logged Out</span>
          </span>
        )
      case 'FAILED':
        return (
          <span className="flex items-center space-x-1 px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase rounded-sm bg-[#141414] text-red-400 border border-red-500/30 w-fit">
            <ShieldAlert className="h-2.5 w-2.5" />
            <span>Failed</span>
          </span>
        )
      case 'EXPIRED':
        return (
          <span className="flex items-center space-x-1 px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase rounded-sm bg-[#141414] text-amber-400 border border-amber-500/30 w-fit">
            <Clock className="h-2.5 w-2.5" />
            <span>Expired</span>
          </span>
        )
      default:
        return (
          <span className="px-1.5 py-0.2 text-[9px] font-mono uppercase rounded-sm bg-[#141414] text-[#6b7280] border border-[#2a2a2a] w-fit">
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

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return <span>{text}</span>
    const regex = new RegExp(`(${query.replace(/[/\\^$*+?.()|[\]{}-]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return (
      <span>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <mark key={i} className="bg-blue-500/30 text-blue-200 rounded-none px-0.5 font-bold normal-case">
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
    <div className="space-y-4 font-mono">
      {/* Filters & Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-[#0f0f0f] p-3 border border-[#1a1a1a] rounded-sm select-none items-center font-mono">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#6b7280]">
            <Search className="h-3.5 w-3.5" />
          </span>
          <input
            type="text"
            placeholder="Search username..."
            value={usernameSearch}
            onChange={handleSearchChange}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm pl-8 pr-3 py-1.5 text-xs text-[#e4e4e4] placeholder-[#404040] focus:border-blue-500 focus:outline-none font-mono"
          />
        </div>

        <div>
          <select
            value={actionFilter}
            onChange={handleActionChange}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-2.5 py-1.5 text-xs text-[#e4e4e4] focus:border-blue-500 focus:outline-none uppercase font-mono cursor-pointer"
          >
            <option value="">ALL ACTIONS</option>
            <option value="LOGIN">LOGIN SESSIONS</option>
            <option value="LOGOUT">LOGGED OUT</option>
            <option value="FAILED_LOGIN">FAILED LOGINS</option>
            <option value="SESSION_EXPIRED">EXPIRATIONS</option>
          </select>
        </div>

        <div>
          <input
            type="date"
            value={dateFrom}
            onChange={handleDateFromChange}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-2.5 py-1.5 text-xs text-[#e4e4e4] focus:border-blue-500 focus:outline-none [color-scheme:dark] font-mono"
            title="From Date"
          />
        </div>
        
        <div>
          <input
            type="date"
            value={dateTo}
            onChange={handleDateToChange}
            min={dateFrom}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-2.5 py-1.5 text-xs text-[#e4e4e4] focus:border-blue-500 focus:outline-none [color-scheme:dark] font-mono"
            title="To Date"
          />
        </div>

        <div className="flex justify-end items-center space-x-2 lg:col-span-1 sm:col-span-2">
          <button
            onClick={handleExportCSV}
            disabled={groupedSessions.length === 0}
            className="flex items-center space-x-1 bg-[#141414] hover:bg-[#1f1f1f] disabled:opacity-40 text-[#6b7280] hover:text-[#e4e4e4] border border-[#2a2a2a] px-3 py-1.5 rounded-sm text-xs font-mono uppercase transition cursor-pointer"
            title="Download CSV"
          >
            <Download className="h-3 w-3 text-blue-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="flex items-center space-x-1 bg-[#141414] hover:bg-[#1f1f1f] text-[#6b7280] hover:text-[#e4e4e4] border border-[#2a2a2a] px-3 py-1.5 rounded-sm text-xs font-mono uppercase transition disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin text-blue-400' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 overflow-hidden">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 w-full bg-[#141414] animate-pulse" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-8 bg-[#0f0f0f] border border-red-500/30 rounded-sm p-6 max-w-xl mx-auto font-mono">
          <ShieldAlert className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-xs font-bold uppercase text-[#e4e4e4] mb-1">Query Failure</h3>
          <p className="text-red-400 font-mono text-xs">{(error as any).message}</p>
        </div>
      ) : groupedSessions.length === 0 ? (
        <div className="text-center py-12 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-6 max-w-md mx-auto select-none font-mono">
          <Info className="h-8 w-8 text-[#404040] mx-auto mb-2" />
          <h3 className="text-xs font-bold uppercase text-[#e4e4e4] mb-1">No Audit Logs</h3>
          <p className="text-[#6b7280] text-xs mb-3">No user session activities match the filter criteria.</p>
          {(usernameSearch || actionFilter || dateFrom || dateTo) && (
            <button
              onClick={clearFilters}
              className="text-blue-400 hover:underline text-xs font-mono uppercase transition cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm overflow-hidden font-mono">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-[#1a1a1a] bg-[#0a0a0a] text-[#6b7280] uppercase tracking-wider select-none">
                  <th className="py-2.5 px-4">User</th>
                  <th className="py-2.5 px-4">State</th>
                  <th className="py-2.5 px-4">Start</th>
                  <th className="py-2.5 px-4">End</th>
                  <th className="py-2.5 px-4">Duration</th>
                  <th className="py-2.5 px-4">Client</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a] text-[#e4e4e4]">
                {groupedSessions.map((session: any) => {
                  const loginStr = session.login_time ? new Date(session.login_time).toLocaleString() : '—'
                  const logoutStr = session.status === 'ACTIVE' 
                    ? 'ACTIVE' 
                    : (session.logout_time ? new Date(session.logout_time).toLocaleString() : '—')
                  const duration = getDuration(session.login_time, session.logout_time, session.status)
                  const client = parseUserAgent(session.device)

                  return (
                    <tr key={session.id} className="hover:bg-[#141414] transition-colors">
                      <td className="py-2.5 px-4 font-bold text-[#e4e4e4]">
                        {highlightMatch(session.username, usernameSearch)}
                      </td>
                      <td className="py-2.5 px-4">
                        {getStatusBadge(session.status)}
                      </td>
                      <td className="py-2.5 px-4 text-[#6b7280] tabular-nums">
                        {loginStr}
                      </td>
                      <td className="py-2.5 px-4 text-[#6b7280] tabular-nums">
                        <span className={session.status === 'ACTIVE' ? 'text-emerald-400 font-bold' : ''}>
                          {logoutStr}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[#e4e4e4] font-bold tabular-nums">
                        {duration}
                      </td>
                      <td className="py-2.5 px-4" title={`${session.ip_address || '—'} | ${session.device || '—'}`}>
                        <span className="text-[#e4e4e4] font-mono block">{session.ip_address || '—'}</span>
                        <span className="text-[10px] text-[#6b7280] flex items-center space-x-1 mt-0.5 select-none">
                          {client.deviceType === 'mobile' ? (
                            <Smartphone className="h-3 w-3 shrink-0" />
                          ) : (
                            <Monitor className="h-3 w-3 shrink-0" />
                          )}
                          <span className="truncate max-w-[180px]">{client.label}</span>
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
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#1a1a1a] bg-[#0a0a0a] text-xs font-mono">
              <div className="text-[#6b7280] tabular-nums">
                SHOWING PAGE <span className="font-bold text-[#e4e4e4]">{page}</span> OF <span className="font-bold text-[#e4e4e4]">{totalPages}</span> ({count} ENTRIES)
              </div>
              <div className="flex space-x-1.5">
                <button
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 bg-[#141414] hover:bg-[#1f1f1f] text-[#6b7280] hover:text-[#e4e4e4] border border-[#2a2a2a] rounded-sm uppercase transition disabled:opacity-40 cursor-pointer"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1 bg-[#141414] hover:bg-[#1f1f1f] text-[#6b7280] hover:text-[#e4e4e4] border border-[#2a2a2a] rounded-sm uppercase transition disabled:opacity-40 cursor-pointer"
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
