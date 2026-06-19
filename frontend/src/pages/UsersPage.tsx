import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Database, Trash2, Upload, Download, AlertTriangle, X } from 'lucide-react'
import { useApi, useAuth, useToast } from '../App'

export function UsersPage() {
  const { request } = useApi()
  const { showToast } = useToast()
  const { role, username: currentUsername, token } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (role !== 'ROOT') {
      navigate('/')
    }
  }, [role, navigate])

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  
  const [usernameInput, setUsernameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [currentPasswordInput, setCurrentPasswordInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [firstNameInput, setFirstNameInput] = useState('')
  const [lastNameInput, setLastNameInput] = useState('')
  const [roleInput, setRoleInput] = useState('REGULAR')
  const [isActiveInput, setIsActiveInput] = useState(true)
  
  const [formError, setFormError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState('users') // 'users' or 'backups'
  const [selectedBackup, setSelectedBackup] = useState<any>(null)
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false)
  const [restoreConfirmInput, setRestoreConfirmInput] = useState('')

  const [isUploading, setIsUploading] = useState(false)

  const handleDownloadBackup = async (filename: string) => {
    try {
      const res = await fetch(`/api/backups/download_backup/?filename=${encodeURIComponent(filename)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!res.ok) {
        throw new Error('Download failed')
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      showToast(err.message || 'Failed to download backup', 'error')
    }
  }

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.name.endsWith('.dump')) {
      showToast('Only .dump files are allowed', 'error')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setIsUploading(true)
    try {
      const res = await request('/api/backups/upload_backup/', {
        method: 'POST',
        body: formData
      })
      showToast(`Backup "${res.filename}" uploaded successfully!`, 'success')
      queryClient.invalidateQueries({ queryKey: ['backupsList'] })
    } catch (err: any) {
      showToast(err.message || 'Failed to upload backup', 'error')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  // Fetch users
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['usersListAdmin'],
    queryFn: () => request('/api/users/').then(data => Array.isArray(data) ? data : data.results),
    enabled: role === 'ROOT'
  })

  // Fetch backups
  const { data: backups, isLoading: isBackupsLoading, error: backupsError } = useQuery({
    queryKey: ['backupsList'],
    queryFn: () => request('/api/backups/'),
    enabled: role === 'ROOT' && activeTab === 'backups'
  })

  // Create Backup Mutation
  const createBackupMutation = useMutation({
    mutationFn: () => request('/api/backups/', {
      method: 'POST'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backupsList'] })
    },
    onError: (err) => {
      showToast(err.message || 'Failed to create backup', 'error')
    }
  })

  // Delete Backup Mutation
  const deleteBackupMutation = useMutation({
    mutationFn: (filename: any) => request('/api/backups/delete_backup/', {
      method: 'POST',
      body: JSON.stringify({ filename })
    }),
    onSuccess: () => {
      showToast('Backup deleted successfully', 'success')
      queryClient.invalidateQueries({ queryKey: ['backupsList'] })
    },
    onError: (err) => {
      showToast(err.message || 'Failed to delete backup', 'error')
    }
  })

  // Restore Backup Mutation
  const restoreBackupMutation = useMutation({
    mutationFn: (filename: any) => request('/api/backups/restore/', {
      method: 'POST',
      body: JSON.stringify({ filename })
    }),
    onSuccess: () => {
      setShowRestoreConfirmModal(false)
      setSelectedBackup(null)
      setRestoreConfirmInput('')
      showToast('Database restore completed successfully! Search index has been rebuilt.', 'success')
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    },
    onError: (err) => {
      showToast(err.message || 'Failed to restore backup', 'error')
    }
  })

  // Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: (data: any) => request('/api/users/', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usersListAdmin'] })
      closeForm()
    },
    onError: (err) => {
      setFormError(err.message || 'Failed to create user')
    }
  })

  // Update User Mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: any, data: any }) => request(`/api/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usersListAdmin'] })
      closeForm()
    },
    onError: (err) => {
      setFormError(err.message || 'Failed to update user')
    }
  })

  // Toggle user active status directly
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: any, is_active: any }) => request(`/api/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usersListAdmin'] })
    }
  })

  // Delete User Mutation
  const deleteUserMutation = useMutation({
    mutationFn: (id: any) => request(`/api/users/${id}/`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usersListAdmin'] })
    }
  })

  const openAddForm = () => {
    setEditingUser(null)
    setUsernameInput('')
    setPasswordInput('')
    setCurrentPasswordInput('')
    setEmailInput('')
    setFirstNameInput('')
    setLastNameInput('')
    setRoleInput('REGULAR')
    setIsActiveInput(true)
    setFormError(null)
    setIsFormOpen(true)
  }

  const openEditForm = (user: any) => {
    setEditingUser(user)
    setUsernameInput(user.username)
    setPasswordInput('')
    setCurrentPasswordInput('')
    setEmailInput(user.email || '')
    setFirstNameInput(user.first_name || '')
    setLastNameInput(user.last_name || '')
    setRoleInput(user.role)
    setIsActiveInput(user.is_active)
    setFormError(null)
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingUser(null)
    setCurrentPasswordInput('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const payload: any = {
      username: usernameInput,
      email: emailInput,
      first_name: firstNameInput,
      last_name: lastNameInput,
      role: roleInput,
      is_active: isActiveInput
    }

    if (editingUser) {
      if (passwordInput.trim()) {
        payload.password = passwordInput
      }
      if (editingUser.username === currentUsername && (passwordInput.trim() || emailInput !== editingUser.email)) {
        payload.current_password = currentPasswordInput
      }
      updateUserMutation.mutate({ id: editingUser.id, data: payload })
    } else {
      if (!passwordInput.trim()) {
        setFormError('Password is required for new users')
        return
      }
      payload.password = passwordInput
      createUserMutation.mutate(payload)
    }
  }

  const handleToggleActive = (user: any) => {
    if (user.username === currentUsername) {
      showToast('You cannot deactivate your own account.', 'error')
      return
    }
    toggleActiveMutation.mutate({ id: user.id, is_active: !user.is_active })
  }

  const handleDeleteUser = (user: any) => {
    if (user.username === currentUsername) {
      showToast('You cannot delete your own account.', 'error')
      return
    }
    if (window.confirm(`Are you sure you want to permanently delete user "${user.username}"?`)) {
      deleteUserMutation.mutate(user.id)
    }
  }

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
        {activeTab === 'users' ? (
          <button 
            onClick={openAddForm}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-3 rounded-xl font-semibold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300"
          >
            <Plus className="h-5 w-5" />
            <span>Create User</span>
          </button>
        ) : (
          <button 
            onClick={() => createBackupMutation.mutate()}
            disabled={createBackupMutation.isPending}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-3 rounded-xl font-semibold shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all duration-300 disabled:opacity-50"
          >
            {createBackupMutation.isPending ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Database className="h-5 w-5" />
            )}
            <span>{createBackupMutation.isPending ? 'Creating Backup...' : 'Create Backup Now'}</span>
          </button>
        )}
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

      {activeTab === 'users' && (
        isLoading ? (
          <div className="flex justify-center items-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-rose-500/10 border border-rose-500/20 rounded-xl p-8">
            <p className="text-rose-400 font-semibold">Error: {error.message}</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4.5 px-6">Username</th>
                    <th className="py-4.5 px-6 hidden sm:table-cell">Full Name</th>
                    <th className="py-4.5 px-6 hidden md:table-cell">Email</th>
                    <th className="py-4.5 px-6">Role</th>
                    <th className="py-4.5 px-6">Status</th>
                    <th className="py-4.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users?.map((user: any) => {
                    const isSelf = user.username === currentUsername
                    return (
                      <tr key={user.id} className="hover:bg-slate-850/30 transition-colors duration-200">
                        <td className="py-4 px-6 font-bold text-white flex items-center space-x-2">
                          <span>{user.username}</span>
                          {isSelf && (
                            <span className="text-xxs bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-semibold">
                              You
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-slate-300 hidden sm:table-cell">
                          {user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '—'}
                        </td>
                        <td className="py-4 px-6 text-slate-300 hidden md:table-cell">{user.email || '—'}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                            user.role === 'ROOT' 
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                              : user.role === 'ADMIN'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${user.is_active ? 'bg-emerald-500 shadow-md shadow-emerald-500/50' : 'bg-rose-500'}`} />
                            <span className={`text-sm font-medium ${user.is_active ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                          <button 
                            onClick={() => openEditForm(user)}
                            className="bg-slate-955 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                            title="Edit user"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleToggleActive(user)}
                            disabled={isSelf}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                              user.is_active 
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20 disabled:opacity-40' 
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user)}
                            disabled={isSelf}
                            className="bg-rose-500/5 hover:bg-rose-500/15 text-rose-505 hover:text-rose-400 border border-rose-500/10 p-2 rounded-xl text-xs transition disabled:opacity-40"
                            title={isSelf ? 'You cannot delete yourself' : 'Delete user'}
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
        )
      )}

      {activeTab === 'backups' && (
        isBackupsLoading ? (
          <div className="flex justify-center items-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : backupsError ? (
          <div className="text-center py-12 bg-rose-500/10 border border-rose-500/20 rounded-xl p-8">
            <p className="text-rose-400 font-semibold">Error: {backupsError.message}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Upload Backup & Actions */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-2">Upload Backup</h3>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  Upload an offline database backup archive file (`.dump`) to make it available for restore.
                </p>
                <div 
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
                    isUploading 
                      ? 'border-blue-500/50 bg-blue-500/5' 
                      : 'border-slate-800 hover:border-blue-500/50 bg-slate-950/20 hover:bg-slate-955/40'
                  }`}
                  onClick={() => !isUploading && document.getElementById('backup-file-input')?.click()}
                >
                  {isUploading ? (
                    <RefreshCw className="h-10 w-10 text-blue-500 mx-auto mb-4 animate-spin" />
                  ) : (
                    <Upload className="h-10 w-10 text-slate-505 mx-auto mb-4" />
                  )}
                  <span className="text-sm font-bold text-slate-200 block">
                    {isUploading ? 'Uploading Dump File...' : 'Click to Upload Backup'}
                  </span>
                  <span className="text-xs text-slate-505 mt-2 block">
                    Only accepts `.dump` format
                  </span>
                  <input 
                    type="file" 
                    id="backup-file-input" 
                    accept=".dump"
                    className="hidden"
                    disabled={isUploading}
                    onChange={handleUploadFile}
                  />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wider text-slate-400">Nightly Backups</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  The system automatically takes a full database snapshot nightly at 2:00 AM. 
                  Backups older than 14 days are auto-pruned to conserve disk space.
                </p>
              </div>
            </div>

            {/* Right Column: Backups List */}
            <div className="lg:col-span-2">
              {!Array.isArray(backups) || backups.length === 0 ? (
                <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl h-full flex flex-col justify-center items-center">
                  <Database className="h-12 w-12 text-slate-600 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No backups found</h3>
                  <p className="text-slate-400 max-w-md mx-auto mb-8">
                    No database backup files exist in the `/backups` directory on the server.
                  </p>
                  <button
                    onClick={() => createBackupMutation.mutate()}
                    disabled={createBackupMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-505 text-white px-5 py-3 rounded-xl font-semibold transition disabled:opacity-50 inline-flex items-center space-x-2 shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20"
                  >
                    {createBackupMutation.isPending ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <Plus className="h-5 w-5" />
                    )}
                    <span>Create Initial Backup</span>
                  </button>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="py-4.5 px-6">Backup File</th>
                          <th className="py-4.5 px-6">Date Created</th>
                          <th className="py-4.5 px-6">Size</th>
                          <th className="py-4.5 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {Array.isArray(backups) && backups.map((backup: any) => {
                          const dateStr = new Date(backup.created_at).toLocaleString()
                          return (
                            <tr key={backup.filename} className="hover:bg-slate-850/30 transition-colors duration-200">
                              <td className="py-4 px-6 font-bold text-white flex items-center space-x-2">
                                <Database className="h-4 w-4 text-slate-505" />
                                <span className="break-all">{backup.filename}</span>
                              </td>
                              <td className="py-4 px-6 text-slate-300">{dateStr}</td>
                              <td className="py-4 px-6 text-slate-300">
                                {backup.size_kb >= 1024 
                                  ? `${(backup.size_kb / 1024).toFixed(2)} MB` 
                                  : `${backup.size_kb.toFixed(1)} KB`}
                              </td>
                              <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                                <button
                                  onClick={() => handleDownloadBackup(backup.filename)}
                                  className="bg-slate-955 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 p-2 rounded-xl text-xs font-semibold transition"
                                  title="Download Backup File"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedBackup(backup)
                                    setRestoreConfirmInput('')
                                    setShowRestoreConfirmModal(true)
                                  }}
                                  className="bg-rose-600/15 hover:bg-rose-600/30 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                                >
                                  Restore
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to permanently delete backup "${backup.filename}"?`)) {
                                      deleteBackupMutation.mutate(backup.filename)
                                    }
                                  }}
                                  disabled={deleteBackupMutation.isPending}
                                  className="bg-rose-500/5 hover:bg-rose-500/15 text-rose-500 hover:text-rose-400 border border-rose-500/10 p-2 rounded-xl text-xs transition disabled:opacity-40"
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
            </div>
          </div>
        )
      )}

      {/* Create / Edit User Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                {editingUser ? `Edit User: ${editingUser.username}` : 'Create Administrative User'}
              </h2>
              <button onClick={closeForm} className="text-slate-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-4 text-sm font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Username</label>
                <input 
                  type="text" 
                  required
                  disabled={!!editingUser}
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 disabled:opacity-50 disabled:bg-slate-950 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">First Name</label>
                  <input 
                    type="text" 
                    value={firstNameInput}
                    onChange={(e) => setFirstNameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-404 uppercase tracking-wider mb-2">Last Name</label>
                  <input 
                    type="text" 
                    value={lastNameInput}
                    onChange={(e) => setLastNameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Password {editingUser && <span className="text-slate-500 font-normal capitalize">(leave blank to keep current)</span>}
                </label>
                <input 
                  type="password" 
                  required={!editingUser}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                />
              </div>

              {editingUser && editingUser.username === currentUsername && (passwordInput.trim() || emailInput !== editingUser.email) && (
                <div>
                  <label className="block text-xs font-semibold text-rose-455 uppercase tracking-wider mb-2">
                    Current Password <span className="text-slate-500 font-normal capitalize">(required to save changes)</span>
                  </label>
                  <input 
                    type="password" 
                    required
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    className="w-full bg-slate-950 border border-rose-800/40 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none placeholder-rose-900/30"
                    placeholder="Enter current password to verify"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</label>
                <input 
                  type="email" 
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Role</label>
                <select 
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  disabled={editingUser && (editingUser.role === 'ROOT' || editingUser.username === currentUsername)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 disabled:opacity-50 disabled:bg-slate-950 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                >
                  {roleInput === 'ROOT' && (
                    <option value="ROOT">Root (Superuser)</option>
                  )}
                  <option value="REGULAR">Regular (Read-Only)</option>
                  <option value="ADMIN">Admin (Read-Write)</option>
                </select>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <input 
                  type="checkbox"
                  id="user-active-checkbox"
                  checked={isActiveInput}
                  onChange={(e) => setIsActiveInput(e.target.checked)}
                  disabled={editingUser && editingUser.username === currentUsername}
                  className="h-4.5 w-4.5 bg-slate-950 border border-slate-800 rounded focus:ring-0 text-blue-505"
                />
                <label htmlFor="user-active-checkbox" className="text-sm font-semibold text-slate-300 cursor-pointer">
                  Is Account Active
                </label>
              </div>

              <div className="border-t border-slate-800 pt-5 flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={closeForm}
                  className="bg-slate-955 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-md shadow-blue-500/10 hover:shadow-blue-500/20"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Database Restore Double Confirmation Modal */}
      {showRestoreConfirmModal && selectedBackup && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center space-x-2 text-rose-455">
                <AlertTriangle className="h-5 w-5" />
                <h2 className="text-xl font-bold text-white">Confirm Database Restore</h2>
              </div>
              <button 
                onClick={() => {
                  setShowRestoreConfirmModal(false)
                  setSelectedBackup(null)
                }} 
                className="text-slate-405 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-sm font-medium leading-relaxed font-sans">
                <strong>Warning:</strong> Restoring the database will overwrite all current data in the system (dies, machines, sets, users, history). Any modifications made since the backup was taken will be permanently lost.
              </div>

              <div>
                <p className="text-sm text-slate-300 mb-2">You are about to restore from:</p>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white break-all flex items-center space-x-2">
                  <Database className="h-4 w-4 text-slate-505 flex-shrink-0" />
                  <span>{selectedBackup.filename}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-404 uppercase tracking-wider mb-2">
                  Type <span className="text-rose-405 font-bold">RESTORE</span> to confirm:
                </label>
                <input 
                  type="text"
                  value={restoreConfirmInput}
                  onChange={(e) => setRestoreConfirmInput(e.target.value)}
                  className="w-full bg-slate-955 border border-slate-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none placeholder-slate-700"
                  placeholder="Type RESTORE"
                />
              </div>

              <div className="border-t border-slate-800 pt-4 flex justify-end space-x-2">
                <button 
                  onClick={() => {
                    setShowRestoreConfirmModal(false)
                    setSelectedBackup(null)
                  }}
                  className="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 px-5 py-2.5 rounded-xl text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (restoreConfirmInput === 'RESTORE') {
                      restoreBackupMutation.mutate(selectedBackup.filename)
                    }
                  }}
                  disabled={restoreConfirmInput !== 'RESTORE' || restoreBackupMutation.isPending}
                  className="bg-rose-600 hover:bg-rose-505 disabled:bg-rose-800/40 disabled:text-rose-400/50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition shadow-md shadow-rose-500/10 hover:shadow-rose-500/20 disabled:shadow-none inline-flex items-center space-x-2"
                >
                  {restoreBackupMutation.isPending && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}
                  <span>{restoreBackupMutation.isPending ? 'Restoring...' : 'Execute Restore'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
