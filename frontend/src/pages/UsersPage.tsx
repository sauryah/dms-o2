import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Database, ClipboardList, Shield, Activity } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import { UserManager } from './users/UserManager'
import { BackupManager } from './users/BackupManager'
import { SessionAuditLogs } from './users/SessionAuditLogs'
import { ActiveSessionsList } from './users/ActiveSessionsList'

export function UsersPage() {
  const { role } = useAuth()
  const [activeTab, setActiveTab] = useState('users') // 'users', 'backups', 'logs', or 'sessions'
  const { request } = useApi()

  const { data: counts } = useQuery({
    queryKey: ['adminCounts'],
    queryFn: () => request('/api/users/counts/'),
    staleTime: 30000
  })

  if (role !== 'ROOT') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen text-[#e4e4e4] font-mono">
        <div className="flex flex-col items-center justify-center text-center p-12 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm space-y-3">
          <Shield className="h-8 w-8 text-red-500" />
          <h2 className="text-xs font-medium uppercase tracking-[0.05em] text-[#e4e4e4]">01 ACCESS DENIED</h2>
          <p className="text-xs text-[#6b7280] max-w-md">
            Insufficient authorization privileges. ROOT node key required.
          </p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'users', label: 'User Directory', count: counts?.total_users, icon: Users, desc: 'Manage administrative credentials, system roles, and account statuses.' },
    { id: 'backups', label: 'Database Backups', count: counts?.total_backups, icon: Database, desc: 'Create, manage, and restore database backup archives (PostgreSQL format).' },
    { id: 'logs', label: 'Security Audit Logs', count: undefined, icon: ClipboardList, desc: 'View real-time login, logout, failed attempt, and session expiration audit logs.' },
    { id: 'sessions', label: 'Active Sessions', count: counts?.active_sessions, icon: Activity, desc: 'Monitor currently logged-in devices and force-logout active sessions.' }
  ]

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen text-[#e4e4e4] font-mono">
      {/* Title Header */}
      <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 md:p-5 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <div className="p-1 bg-[#141414] border border-[#2a2a2a] rounded-sm text-blue-400">
                <Shield className="h-4 w-4" />
              </div>
              <h1 className="text-sm md:text-base font-medium text-[#e4e4e4] uppercase tracking-[0.05em] font-mono">
                01 SYSTEM ADMINISTRATION NODE
              </h1>
            </div>
            <p className="text-[#6b7280] text-xs mt-1">
              {currentTab.desc}
            </p>
          </div>
          
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-3 py-1 font-mono text-[10px] uppercase text-[#6b7280] select-none flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>ROOT AUTHORIZATION: ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap border-b border-[#1a1a1a] gap-2 mb-6 select-none font-mono">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              className={`flex items-center space-x-2 px-3 py-2 text-xs font-mono uppercase transition-colors cursor-pointer border-b-2 ${
                isActive 
                  ? 'border-blue-500 text-blue-400 font-bold bg-[#0f0f0f]' 
                  : 'border-transparent text-[#6b7280] hover:text-[#e4e4e4]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="bg-[#141414] text-[#6b7280] border border-[#2a2a2a] text-[10px] font-mono px-1.5 py-0.2 rounded-sm tabular-nums">
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'users' && <div id="panel-users" role="tabpanel"><UserManager /></div>}
        {activeTab === 'backups' && <div id="panel-backups" role="tabpanel"><BackupManager /></div>}
        {activeTab === 'logs' && <div id="panel-logs" role="tabpanel"><SessionAuditLogs /></div>}
        {activeTab === 'sessions' && <div id="panel-sessions" role="tabpanel"><ActiveSessionsList /></div>}
      </div>
    </div>
  )
}
