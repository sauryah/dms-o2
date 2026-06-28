import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserManager } from './users/UserManager'
import { BackupManager } from './users/BackupManager'

export function UsersPage() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('users') // 'users' or 'backups'

  useEffect(() => {
    if (role !== 'ROOT') {
      navigate('/')
    }
  }, [role, navigate])

  if (role !== 'ROOT') {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {activeTab === 'users' ? 'User Administration' : 'System Backups'}
          </h1>
          <p className="text-slate-400 mt-1">
            {activeTab === 'users' 
              ? 'Manage administrative credentials, system roles, and account statuses.' 
              : 'Create, manage, and restore database backup archives (PostgreSQL custom format).'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-6 mb-8">
        <button 
          onClick={() => setActiveTab('users')}
          className={`pb-4 text-md font-semibold border-b-2 transition-all ${
            activeTab === 'users' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          User Management
        </button>
        <button 
          onClick={() => setActiveTab('backups')}
          className={`pb-4 text-md font-semibold border-b-2 transition-all ${
            activeTab === 'backups' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Database Backups
        </button>
      </div>

      {activeTab === 'users' && <UserManager />}
      {activeTab === 'backups' && <BackupManager />}
    </div>
  )
}
