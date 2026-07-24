import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Database, ClipboardList, Shield, Activity } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { UserManager } from './users/UserManager'
import { BackupManager } from './users/BackupManager'
import { SessionAuditLogs } from './users/SessionAuditLogs'
import { ActiveSessionsList } from './users/ActiveSessionsList'

export function UsersPage() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('users') // 'users', 'backups', 'logs', or 'sessions'

  useEffect(() => {
    if (role !== 'ROOT') {
      navigate('/')
    }
  }, [role, navigate])

  if (role !== 'ROOT') {
    return null
  }

  const tabs = [
    { id: 'users', label: 'User Directory', icon: Users, desc: 'Manage administrative credentials, system roles, and account statuses.' },
    { id: 'backups', label: 'Database Backups', icon: Database, desc: 'Create, manage, and restore database backup archives (PostgreSQL format).' },
    { id: 'logs', label: 'Security Audit Logs', icon: ClipboardList, desc: 'View real-time login, logout, failed attempt, and session expiration audit logs.' },
    { id: 'sessions', label: 'Active Sessions', icon: Activity, desc: 'Monitor currently logged-in devices and force-logout active sessions.' }
  ]

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen text-slate-100 font-sans">
      {/* Title Header with Glowing Accent */}
      <div className="relative overflow-hidden bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 md:p-8 mb-8 backdrop-blur-md shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-450">
                <Shield className="h-5 w-5" />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-mono">
                System Administration
              </h1>
            </div>
            <p className="text-slate-400 text-sm max-w-2xl mt-2 leading-relaxed">
              {currentTab.desc}
            </p>
          </div>
          
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl px-4 py-2 font-mono text-xs text-slate-400 select-none flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Root Authorization Node</span>
          </div>
        </div>
      </div>

      {/* Modern Tabs Navigation */}
      <div className="flex flex-wrap border-b border-slate-800/80 gap-1 md:gap-2 mb-8 select-none">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center space-x-2 px-4 py-3 text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                isActive 
                  ? 'text-white font-bold' 
                  : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Panels with Framer Motion Transition */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {activeTab === 'users' && <UserManager />}
            {activeTab === 'backups' && <BackupManager />}
            {activeTab === 'logs' && <SessionAuditLogs />}
            {activeTab === 'sessions' && <ActiveSessionsList />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

