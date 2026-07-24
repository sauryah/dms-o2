import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X, Search, Filter, Shield, Key, Mail, User, Info, Check, ArrowRight, ShieldAlert, Monitor, Smartphone } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useApi } from '../../hooks/useApi'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'

export function UserManager() {
  const { request } = useApi()
  const { showToast } = useToast()
  const { username: currentUsername } = useAuth()
  const queryClient = useQueryClient()

  // UI States
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [expandedUserLogs, setExpandedUserLogs] = useState<string | null>(null)
  
  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  
  const toggleUserLogs = (username: string) => {
    if (expandedUserLogs === username) {
      setExpandedUserLogs(null)
    } else {
      setExpandedUserLogs(username)
    }
  }
  
  // Form Inputs
  const [usernameInput, setUsernameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [currentPasswordInput, setCurrentPasswordInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [firstNameInput, setFirstNameInput] = useState('')
  const [lastNameInput, setLastNameInput] = useState('')
  const [roleInput, setRoleInput] = useState('REGULAR')
  const [isActiveInput, setIsActiveInput] = useState(true)
  const [isAuthorizedForToolsInput, setIsAuthorizedForToolsInput] = useState(false)
  const [authorizedToolsInput, setAuthorizedToolsInput] = useState<string[]>([])
  
  const [formError, setFormError] = useState<string | null>(null)
  const [userToDelete, setUserToDelete] = useState<any>(null)

  // Fetch Users
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['usersListAdmin'],
    queryFn: () => request('/api/users/')
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
      showToast('User created successfully', 'success')
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
      showToast('User updated successfully', 'success')
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
      showToast('User status updated successfully', 'success')
    },
    onError: (err) => {
      showToast(err.message || 'Failed to update user status', 'error')
    }
  })

  // Delete User Mutation
  const deleteUserMutation = useMutation({
    mutationFn: (id: any) => request(`/api/users/${id}/`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usersListAdmin'] })
      showToast('User deleted successfully', 'success')
    },
    onError: (err) => {
      showToast(err.message || 'Failed to delete user', 'error')
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
    setIsAuthorizedForToolsInput(false)
    setAuthorizedToolsInput([])
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
    setIsAuthorizedForToolsInput(user.is_authorized_for_tools || false)
    setAuthorizedToolsInput(user.authorized_tools || [])
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
      is_active: isActiveInput,
      is_authorized_for_tools: isAuthorizedForToolsInput,
      authorized_tools: isAuthorizedForToolsInput ? authorizedToolsInput : []
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
    setUserToDelete(user)
  }

  // Filter Logic
  const filteredUsers = users.filter((user: any) => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (`${user.first_name || ''} ${user.last_name || ''}`).toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
    const matchesStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'ACTIVE' && user.is_active) || 
      (statusFilter === 'INACTIVE' && !user.is_active)
      
    return matchesSearch && matchesRole && matchesStatus
  })

  // Get dynamic background and color for user avatar
  const getAvatarStyle = (username: string) => {
    const chars = username.charCodeAt(0) + (username.charCodeAt(1) || 0)
    const hues = [200, 240, 280, 320, 360, 20, 120, 160]
    const hue = hues[chars % hues.length]
    return {
      background: `hsla(${hue}, 70%, 15%, 0.4)`,
      color: `hsl(${hue}, 85%, 65%)`,
      border: `1px solid hsla(${hue}, 70%, 30%, 0.3)`
    }
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Action Filter Row */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-slate-900/60 p-4 border border-slate-800/80 rounded-2xl backdrop-blur-sm select-none">
        
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-550">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search username, name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-550 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-950/20 transition-all font-mono"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-xl">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent border-none text-[11px] text-slate-300 focus:outline-none cursor-pointer font-semibold font-mono"
            >
              <option value="ALL" className="bg-slate-950">ALL ROLES</option>
              <option value="ROOT" className="bg-slate-950">ROOT ONLY</option>
              <option value="ADMIN" className="bg-slate-950">ADMIN ONLY</option>
              <option value="OPERATOR" className="bg-slate-950">OPERATOR ONLY</option>
              <option value="REGULAR" className="bg-slate-950">REGULAR ONLY</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-xl">
            <Shield className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-[11px] text-slate-300 focus:outline-none cursor-pointer font-semibold font-mono"
            >
              <option value="ALL" className="bg-slate-950">ALL STATUS</option>
              <option value="ACTIVE" className="bg-slate-950">ACTIVE ONLY</option>
              <option value="INACTIVE" className="bg-slate-950">INACTIVE ONLY</option>
            </select>
          </div>

          <button 
            onClick={openAddForm}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create User</span>
          </button>
        </div>

      </div>

      {isLoading ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <div className="h-4 w-48 bg-slate-800 rounded animate-pulse" />
            <div className="h-8 w-28 bg-slate-800 rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 w-full bg-slate-800 rounded animate-pulse" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8 max-w-xl mx-auto shadow-lg">
          <ShieldAlert className="h-10 w-10 text-rose-550 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Query Failure</h3>
          <p className="text-rose-455 font-mono text-sm">{error.message}</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 max-w-md mx-auto shadow-xl select-none">
          <User className="h-12 w-12 text-slate-655 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-1 font-mono">No Users Match</h3>
          <p className="text-slate-400 text-sm">Adjust search keywords or role filters to find accounts.</p>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md text-slate-450 text-[10px] font-bold uppercase tracking-wider select-none">
                  <th className="py-4.5 px-6 font-mono">Username Identity</th>
                  <th className="py-4.5 px-6 hidden sm:table-cell font-mono">Full Name</th>
                  <th className="py-4.5 px-6 hidden md:table-cell font-mono">Email Address</th>
                  <th className="py-4.5 px-6 font-mono">Role</th>
                  <th className="py-4.5 px-6 font-mono">Status</th>
                  <th className="py-4.5 px-6 font-mono">Tools Access</th>
                  <th className="py-4.5 px-6 text-right font-mono">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50">
                {filteredUsers.map((user: any) => {
                  const isSelf = user.username === currentUsername
                  const avatarStyle = getAvatarStyle(user.username)
                  
                  return (
                    <React.Fragment key={user.id}>
                      <tr className="group hover:bg-slate-850/25 transition-all duration-150">
                        
                        {/* Username Column with Avatar Initial */}
                        <td className="py-3.5 px-6 font-bold text-white">
                          <div className="flex items-center space-x-3">
                            <div 
                              style={avatarStyle}
                              className="h-8 w-8 rounded-full flex items-center justify-center font-mono text-sm font-extrabold select-none uppercase"
                            >
                              {user.username.charAt(0)}
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-sm">{user.username}</span>
                              {isSelf && (
                                <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold select-none">
                                  YOU
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        {/* Full Name */}
                        <td className="py-3.5 px-6 text-slate-300 hidden sm:table-cell text-sm">
                          {user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '—'}
                        </td>
                        
                        {/* Email */}
                        <td className="py-3.5 px-6 text-slate-350 hidden md:table-cell font-mono text-xs">
                          {user.email || '—'}
                        </td>
                        
                        {/* Role Badges */}
                        <td className="py-3.5 px-6">
                          <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border tracking-wide font-mono ${
                            user.role === 'ROOT' 
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_8px_rgba(168,85,247,0.05)]' 
                              : user.role === 'ADMIN'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.05)]'
                              : user.role === 'OPERATOR'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.05)]'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        
                        {/* Status Check indicator */}
                        <td className="py-3.5 px-6">
                          <div className="flex items-center space-x-2">
                            <span className={`h-2 w-2 rounded-full ${user.is_active ? 'bg-emerald-500 shadow-md shadow-emerald-500/50' : 'bg-rose-500'}`} />
                            <span className={`text-xs font-semibold ${user.is_active ? 'text-emerald-450' : 'text-rose-455'}`}>
                              {user.is_active ? 'Active' : 'Deactivated'}
                            </span>
                          </div>
                        </td>
                        
                        {/* Tools Access Badge */}
                        <td className="py-3.5 px-6">
                          {user.role === 'ROOT' ? (
                            <span className="px-2 py-0.5 text-[9px] font-extrabold rounded border bg-purple-500/10 text-purple-400 border-purple-500/20 font-mono tracking-wide">
                              SYSTEM ROOT
                            </span>
                          ) : user.is_authorized_for_tools ? (
                            <span 
                              className="px-2 py-0.5 text-[9px] font-extrabold rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono tracking-wide cursor-help select-none" 
                              title={user.authorized_tools && user.authorized_tools.length > 0
                                ? user.authorized_tools.map((t: string) => {
                                    if (t === 'sizing-calculator') return 'Sizing'
                                    if (t === 'wire-drawing-calculator') return 'Wire Drawing'
                                    if (t === 'die-series-generator') return 'Die Generator'
                                    return t
                                  }).join(', ')
                                : 'None'}
                            >
                              {user.authorized_tools && user.authorized_tools.length > 0
                                ? `${user.authorized_tools.length} MODULES`
                                : 'NO LISCENSE'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[9px] font-extrabold rounded border bg-slate-800 text-slate-500 border-slate-700/80 font-mono tracking-wide select-none">
                              RESTRICTED
                            </span>
                          )}
                        </td>
                        
                        {/* Action buttons */}
                        <td className="py-3.5 px-6 text-right space-x-2 whitespace-nowrap">
                          <button 
                            onClick={() => toggleUserLogs(user.username)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                              expandedUserLogs === user.username
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-slate-950/40 hover:bg-slate-900 text-slate-400 hover:text-white border-slate-800/80'
                            }`}
                            title="View audit activity logs"
                          >
                            {expandedUserLogs === user.username ? 'Hide Logs' : 'Logs'}
                          </button>
                          
                          <button 
                            onClick={() => openEditForm(user)}
                            className="bg-slate-950/40 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-800/80 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                          >
                            Edit
                          </button>
                          
                          <button 
                            onClick={() => handleToggleActive(user)}
                            disabled={isSelf}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                              user.is_active 
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-455 border-rose-500/20 disabled:opacity-40' 
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-450 border-emerald-500/20'
                            }`}
                          >
                            {user.is_active ? 'Suspend' : 'Activate'}
                          </button>
                          
                          <button 
                            onClick={() => handleDeleteUser(user)}
                            disabled={isSelf}
                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-550 border border-rose-500/20 p-2 rounded-xl text-xs transition disabled:opacity-40"
                            title={isSelf ? 'You cannot delete yourself' : 'Delete user'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>

                      </tr>
                      
                      {/* Expanded Activity Logs */}
                      {expandedUserLogs === user.username && (
                        <tr>
                          <td colSpan={7} className="p-0 bg-slate-950/20 border-t border-b border-slate-850/60">
                            <div className="px-6 py-4 bg-slate-950/40">
                              <UserActivityLogSection username={user.username} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit User Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[16px] max-w-lg w-full shadow-xl overflow-hidden animate-fadeIn">
            
            {/* Modal Header */}
            <div className="bg-[var(--color-surface-2)] py-2 px-4 flex justify-between items-center border-b border-[var(--color-border)]">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-[var(--color-primary)]" />
                <h2 className="text-base font-semibold text-[var(--color-primary)]">
                  {editingUser ? `Configure: ${editingUser.username}` : 'Create System Credentials'}
                </h2>
              </div>
              <button onClick={closeForm} className="text-[var(--color-muted)] hover:text-[var(--color-text)] p-1 hover:bg-[var(--color-surface-2)] rounded-lg transition cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scroll Container */}
            <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-4 space-y-4">
              {formError && (
                <div className="bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-[var(--color-danger)] rounded-xl p-4 text-xs font-semibold font-mono flex items-center space-x-2">
                  <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-[var(--color-danger)]" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Username Input (Read-only if editing) */}
              <div className="space-y-1.5">
                <label className="block text-xs text-[var(--color-muted)] font-medium">Username Identity</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-550">
                    <User className="h-4 w-4" />
                  </span>
                  <input 
                    type="text" 
                    required
                    disabled={!!editingUser}
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] rounded-[12px] pl-9 pr-4 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/20 transition-all"
                    placeholder="e.g. jdoe"
                  />
                </div>
              </div>

              {/* First & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider font-mono">First Name</label>
                  <input 
                    type="text" 
                    value={firstNameInput}
                    onChange={(e) => setFirstNameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-4 focus:ring-blue-950/20 transition-all"
                    placeholder="John"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider font-mono">Last Name</label>
                  <input 
                    type="text" 
                    value={lastNameInput}
                    onChange={(e) => setLastNameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-4 focus:ring-blue-950/20 transition-all"
                    placeholder="Doe"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs text-[var(--color-muted)] font-medium">Access Key {editingUser && <span className="text-[var(--color-muted)] font-normal capitalize">(leave blank to keep current)</span>}</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-550">
                    <Key className="h-4 w-4" />
                  </span>
                  <input 
                    type="password" 
                    required={!editingUser}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] rounded-[12px] pl-9 pr-4 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/20 transition-all"
                    placeholder={editingUser ? "••••••••" : "Min 8 characters"}
                  />
                </div>
              </div>

              {/* Verify Current Password (If updating sensitive profile) */}
              {editingUser && editingUser.username === currentUsername && (passwordInput.trim() || emailInput !== editingUser.email) && (
                <div className="space-y-1.5 bg-rose-500/5 p-4 border border-rose-500/20 rounded-xl">
                  <label className="block text-[10px] font-bold text-rose-400 uppercase tracking-wider font-mono">
                    Verify Profile Identity <span className="text-slate-500 font-normal capitalize">(required to save updates)</span>
                  </label>
                  <input 
                    type="password" 
                    required
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    className="w-full bg-slate-950 border border-rose-800/40 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:ring-4 focus:ring-rose-950/20 transition-all font-mono"
                    placeholder="Enter current password to authorize changes"
                  />
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-xs text-[var(--color-muted)] font-medium">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-muted)]">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input 
                    type="email" 
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] rounded-[12px] pl-9 pr-4 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/20 transition-all"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              {/* System role dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs text-[var(--color-muted)] font-medium">System authorization Role</label>
                <select 
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  disabled={editingUser && (editingUser.role === 'ROOT' || editingUser.username === currentUsername)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] disabled:opacity-50 disabled:bg-[var(--color-surface)] rounded-[12px] px-4 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/20 transition-all cursor-pointer"
                >
                  {roleInput === 'ROOT' && (
                    <option value="ROOT">ROOT (SUPERUSER ACCESS)</option>
                  )}
                  <option value="REGULAR">REGULAR (READ-ONLY VIEW)</option>
                  <option value="OPERATOR">OPERATOR (RELOCATION DRAG-MAP)</option>
                  <option value="ADMIN">ADMIN (READ-WRITE ACTIONS)</option>
                </select>
              </div>

              {/* Checkboxes Row */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                
                {/* Active Toggle Box */}
                <div 
                  className={`flex-1 flex items-center justify-between p-3.5 rounded-[12px] border transition cursor-pointer select-none ${
                    isActiveInput 
                      ? 'border-[var(--color-success)]/20 bg-[var(--color-success)]/[0.02]' 
                      : 'border-[var(--color-border)] bg-transparent'
                  }`}
                  onClick={() => {
                    if (!(editingUser && editingUser.username === currentUsername)) {
                      setIsActiveInput(!isActiveInput)
                    }
                  }}
                >
                  <div className="space-y-0.5">
                    <span className="block text-xs font-semibold text-white">Status Status</span>
                    <span className="block text-[10px] text-slate-400">Suspend/Activate credentials</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={isActiveInput}
                    disabled={editingUser && editingUser.username === currentUsername}
                    onChange={(e) => setIsActiveInput(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-slate-700 bg-slate-950 text-blue-500 focus:ring-0 cursor-pointer disabled:opacity-40"
                  />
                </div>

                {/* Sizing Tools authorization Box */}
                <div 
                  className={`flex-1 flex items-center justify-between p-3.5 rounded-[12px] border transition cursor-pointer select-none ${
                    roleInput === 'ROOT' || isAuthorizedForToolsInput 
                      ? 'border-[var(--color-primary)]/20 bg-[var(--color-primary)]/[0.02]' 
                      : 'border-[var(--color-border)] bg-transparent'
                  }`}
                  onClick={() => {
                    if (roleInput !== 'ROOT') {
                      const nextVal = !isAuthorizedForToolsInput
                      setIsAuthorizedForToolsInput(nextVal)
                      if (nextVal && authorizedToolsInput.length === 0) {
                        setAuthorizedToolsInput(['sizing-calculator', 'wire-drawing-calculator'])
                      }
                    }
                  }}
                >
                  <div className="space-y-0.5">
                    <span className="block text-xs font-semibold text-white">Toolbox Licenses</span>
                    <span className="block text-[10px] text-slate-400">Unlock tool panel features</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={roleInput === 'ROOT' || isAuthorizedForToolsInput}
                    disabled={roleInput === 'ROOT'}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setIsAuthorizedForToolsInput(checked)
                      if (checked && authorizedToolsInput.length === 0) {
                        setAuthorizedToolsInput(['sizing-calculator', 'wire-drawing-calculator'])
                      }
                    }}
                    className="h-4.5 w-4.5 rounded border-slate-700 bg-slate-950 text-blue-500 focus:ring-0 cursor-pointer disabled:opacity-40"
                  />
                </div>

              </div>

              {/* Interactive Module Tree Panel */}
              {isAuthorizedForToolsInput && roleInput !== 'ROOT' && (
                <div className="p-4 bg-[var(--color-surface-2)]/60 border-[var(--color-border)]/80 rounded-xl space-y-4 animate-fadeIn">
                  <div className="flex items-center space-x-1.5 border-b border-slate-800 pb-2 mb-2">
                    <Shield className="h-4 w-4 text-blue-450" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300 font-mono">
                      Engineering Permission Matrix Tree
                    </span>
                  </div>

                  {/* Top-Level Tool 1: Sizing Calculator */}
                  <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-805 rounded-xl hover:border-slate-700 transition">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="tool-sizing-calculator"
                        checked={authorizedToolsInput.includes('sizing-calculator')}
                        onChange={() => {
                          const isChecked = authorizedToolsInput.includes('sizing-calculator');
                          setAuthorizedToolsInput(prev =>
                            isChecked ? prev.filter(id => id !== 'sizing-calculator') : [...prev, 'sizing-calculator']
                          );
                        }}
                        className="h-4.5 w-4.5 rounded border-slate-700 bg-slate-950 text-blue-500 cursor-pointer"
                      />
                      <label htmlFor="tool-sizing-calculator" className="text-xs font-bold text-slate-200 cursor-pointer select-none">
                        Sizing & Elongation Calculator
                      </label>
                    </div>
                    <span className="text-[9px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded font-extrabold">
                      MODULE SIZING
                    </span>
                  </div>

                  {/* Top-Level Tool 2: Wire Drawing Calculator */}
                  <div className="p-3 bg-slate-900 border border-slate-805 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="tool-wire-drawing-calculator"
                          checked={authorizedToolsInput.includes('wire-drawing-calculator')}
                          onChange={() => {
                            const isChecked = authorizedToolsInput.includes('wire-drawing-calculator');
                            setAuthorizedToolsInput(prev =>
                              isChecked ? prev.filter(id => id !== 'wire-drawing-calculator') : [...prev, 'wire-drawing-calculator']
                            );
                          }}
                          className="h-4.5 w-4.5 rounded border-slate-700 bg-slate-950 text-blue-500 cursor-pointer"
                        />
                        <label htmlFor="tool-wire-drawing-calculator" className="text-xs font-bold text-slate-200 cursor-pointer select-none">
                          Wire Drawing Calculator (Base)
                        </label>
                      </div>
                      <span className="text-[9px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded font-extrabold">
                        WORKBENCH BASE
                      </span>
                    </div>

                    {/* Sub-Features Tree Indented Right */}
                    <div className="ml-5 pl-4 border-l-2 border-slate-800 space-y-2.5 pt-1">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center space-x-1 select-none">
                        <span>↳ Sub-feature Permissions</span>
                      </div>

                      {/* Sub-feature 1: 3D Stress Heatmap */}
                      <div className="flex items-center justify-between p-2 bg-slate-950/80 border border-slate-850 rounded-lg">
                        <div className="flex items-center space-x-2.5">
                          <input
                            type="checkbox"
                            id="tool-3d-stress-heatmap"
                            checked={authorizedToolsInput.includes('3d-stress-heatmap')}
                            onChange={() => {
                              const isChecked = authorizedToolsInput.includes('3d-stress-heatmap');
                              setAuthorizedToolsInput(prev =>
                                isChecked ? prev.filter(id => id !== '3d-stress-heatmap') : [...prev, '3d-stress-heatmap']
                              );
                            }}
                            className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-purple-500 cursor-pointer"
                          />
                          <label htmlFor="tool-3d-stress-heatmap" className="text-xs text-slate-350 hover:text-white cursor-pointer select-none">
                            3D von Mises Stress Heatmap
                          </label>
                        </div>
                        <span className="text-[8px] font-mono text-purple-400 bg-purple-950 border border-purple-800 px-1.5 py-0.5 rounded font-extrabold uppercase">
                          3D Model
                        </span>
                      </div>

                      {/* Sub-feature 2: Theory & Fundamentals */}
                      <div className="flex items-center justify-between p-2 bg-slate-950/80 border border-slate-850 rounded-lg">
                        <div className="flex items-center space-x-2.5">
                          <input
                            type="checkbox"
                            id="tool-engineering-theory"
                            checked={authorizedToolsInput.includes('engineering-theory')}
                            onChange={() => {
                              const isChecked = authorizedToolsInput.includes('engineering-theory');
                              setAuthorizedToolsInput(prev =>
                                isChecked ? prev.filter(id => id !== 'engineering-theory') : [...prev, 'engineering-theory']
                              );
                            }}
                            className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-500 cursor-pointer"
                          />
                          <label htmlFor="tool-engineering-theory" className="text-xs text-slate-350 hover:text-white cursor-pointer select-none">
                            Theory & Fundamentals Guide
                          </label>
                        </div>
                        <span className="text-[8px] font-mono text-indigo-400 bg-indigo-950 border border-indigo-805 px-1.5 py-0.5 rounded font-extrabold uppercase">
                          Theory Docs
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top-Level Tool 3: Die Series Generator */}
                  <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-805 rounded-xl hover:border-slate-700 transition">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="tool-die-series-generator"
                        checked={authorizedToolsInput.includes('die-series-generator')}
                        onChange={() => {
                          const isChecked = authorizedToolsInput.includes('die-series-generator');
                          setAuthorizedToolsInput(prev =>
                            isChecked ? prev.filter(id => id !== 'die-series-generator') : [...prev, 'die-series-generator']
                          );
                        }}
                        className="h-4.5 w-4.5 rounded border-slate-700 bg-slate-950 text-blue-500 cursor-pointer"
                      />
                      <label htmlFor="tool-die-series-generator" className="text-xs font-bold text-slate-200 cursor-pointer select-none">
                        Die Series Generator
                      </label>
                    </div>
                    <span className="text-[9px] font-mono text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded font-extrabold">
                      MODULE GENERATOR
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="border-t border-slate-805 pt-5 flex justify-end space-x-3 bg-slate-950/10 -mx-6 -mb-6 p-6">
                <button 
                  type="button" 
                  onClick={closeForm}
                  className="bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-muted)] border border-[var(--color-border)] hover:border-[var(--color-border-dark)] px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                  className="bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md shadow-[var(--color-primary)]/10 hover:shadow-[var(--color-primary)]/20 cursor-pointer"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation */}
      <ConfirmDialog
        isOpen={!!userToDelete}
        title="Delete User Account"
        message={`Are you sure you want to permanently delete user "${userToDelete?.username}"? All associated settings and activity history for this account will be removed.`}
        confirmText="Delete User"
        isDestructive={true}
        onConfirm={() => {
          if (userToDelete) {
            deleteUserMutation.mutate(userToDelete.id)
            setUserToDelete(null)
          }
        }}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  )
}

function UserActivityLogSection({ username }: { username: string }) {
  const { request } = useApi()
  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['userActivityLogs', username],
    queryFn: () => request(`/api/activity-logs/?username=${username}`)
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-6">
        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-xs text-rose-455 font-semibold py-4 font-mono">
        Failed to load activity logs: {error.message}
      </div>
    )
  }

  const results = logs?.results || logs || []

  if (results.length === 0) {
    return (
      <div className="text-center text-xs text-slate-500 py-4 font-semibold font-mono">
        No activity logs recorded for this user.
      </div>
    )
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
    <div className="space-y-4 animate-fadeIn text-left select-none font-mono text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">User Audit Trail</span>
        <span className="text-[10px] text-slate-500 font-semibold">{results.length} activity entries</span>
      </div>

      <div className="relative pl-4 space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {/* Vertical Line */}
        <div className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-slate-800" />

        {results.map((log: any) => {
          const client = parseUserAgent(log.device)
          
          return (
            <div key={log.id} className="relative flex justify-between items-start gap-4 p-3 bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-xl transition">
              
              {/* Event indicator dot */}
              <div className={`absolute -left-[14px] top-4.5 w-2 h-2 rounded-full border border-slate-950 ${
                log.action === 'LOGIN'
                  ? 'bg-emerald-500'
                  : log.action === 'FAILED_LOGIN'
                  ? 'bg-rose-500'
                  : 'bg-slate-500'
              }`} />

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                    log.action === 'LOGIN'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : log.action === 'FAILED_LOGIN'
                      ? 'bg-rose-500/10 text-rose-455 border border-rose-500/20 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {log.action}
                  </span>
                  {log.ip_address && (
                    <span className="text-[10px] text-slate-450 font-bold">IP: {log.ip_address}</span>
                  )}
                </div>
                {log.device && (
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-sans mt-1">
                    {client.deviceType === 'mobile' ? (
                      <Smartphone className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                    ) : (
                      <Monitor className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                    )}
                    <span className="truncate max-w-[300px]" title={log.device}>{client.label}</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-500 whitespace-nowrap pt-0.5">
                {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

