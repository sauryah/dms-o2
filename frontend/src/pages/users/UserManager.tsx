import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X, Search, Filter, Shield, User, ShieldAlert, Monitor, Smartphone, Download } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useApi } from '../../hooks/useApi'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { parseUserAgent } from '../../utils/parseUserAgent'

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
  const [page, setPage] = useState(1)
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set())
  const [bulkActionType, setBulkActionType] = useState<'activate'|'suspend'|'delete'|null>(null)
  
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
  const { data, isLoading, error } = useQuery({
    queryKey: ['usersListAdmin', page, searchQuery, roleFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('page', String(page))
      if (searchQuery.trim()) params.set('search', searchQuery.trim())
      if (roleFilter !== 'ALL') params.set('role', roleFilter)
      if (statusFilter !== 'ALL') params.set('status', statusFilter.toLowerCase())
      return request(`/api/users/?${params.toString()}`, { keepMetadata: true })
    }
  })
  
  const users = data?.results ?? []
  const totalCount = data?.count ?? 0
  const totalPages = Math.ceil(totalCount / 25)

  // Fetch Password Policy
  const { data: passwordPolicy } = useQuery({
    queryKey: ['passwordPolicy'],
    queryFn: () => request('/api/users/password_policy/'),
    staleTime: Infinity
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

  // Toggle Active Status Mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: any, is_active: boolean }) => request(`/api/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usersListAdmin'] })
      showToast('User status updated', 'success')
    },
    onError: (err) => {
      showToast(err.message || 'Failed to update status', 'error')
    }
  })

  // Bulk Action Mutation
  const bulkActionMutation = useMutation({
    mutationFn: (data: { action: string, user_ids: number[] }) => request('/api/users/bulk_action/', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['usersListAdmin'] })
      setSelectedUsers(new Set())
      setBulkActionType(null)
      const failedCount = Array.isArray(data?.failed) ? data.failed.length : 0
      const succeededCount = Array.isArray(data?.succeeded) ? data.succeeded.length : 0
      if (failedCount > 0) {
        showToast(`Completed: ${succeededCount} succeeded, ${failedCount} failed`, 'error')
      } else {
        showToast(`Bulk action completed: ${succeededCount} user(s) updated`, 'success')
      }
    },
    onError: (err) => {
      showToast(err.message || 'Bulk action failed', 'error')
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

  const filteredUsers = users
  
  const handleExportUsers = async () => {
    try {
      const token = localStorage.getItem('dms_token') || ''
      const params = new URLSearchParams()
      if (searchQuery.trim()) params.set('search', searchQuery.trim())
      if (roleFilter !== 'ALL') params.set('role', roleFilter)
      if (statusFilter !== 'ALL') params.set('status', statusFilter.toLowerCase())
      
      const res = await fetch(`/api/v1/users/export/?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-Requested-With': 'XMLHttpRequest' }
      })
      
      if (!res.ok) throw new Error('Export failed')
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      showToast(err.message || 'Failed to export users', 'error')
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setRoleFilter('ALL')
    setStatusFilter('ALL')
    setPage(1)
  }

  const hasActiveFilters = searchQuery.trim() !== '' || roleFilter !== 'ALL' || statusFilter !== 'ALL'

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedUsers(new Set())
    } else {
      const newSet = new Set<number>()
      filteredUsers.forEach((u: any) => {
        if (u.username !== currentUsername) newSet.add(u.id)
      })
      setSelectedUsers(newSet)
    }
  }

  const toggleSelectUser = (id: number) => {
    setSelectedUsers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkAction = (action: 'activate'|'suspend'|'delete') => {
    if (selectedUsers.size === 0) return
    setBulkActionType(action)
  }

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return <span>{text}</span>
    const regex = new RegExp(`(${query.replace(/[/\\^$*+?.()|[\]{}-]/g, '\\$&')})`, 'i')
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

  return (
    <div className="space-y-4 font-mono">
      {/* Top Action Filter Row */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-[#0f0f0f] p-3 border border-[#1a1a1a] rounded-sm select-none">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#6b7280]">
            <Search className="h-3.5 w-3.5" />
          </span>
          <input
            type="text"
            placeholder="Search username, name, or email..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm pl-8 pr-3 py-1.5 text-xs text-[#e4e4e4] placeholder-[#404040] focus:border-blue-500 focus:outline-none font-mono"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 bg-[#0a0a0a] px-2.5 py-1 border border-[#2a2a2a] rounded-sm">
            <Filter className="h-3 w-3 text-[#6b7280]" />
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="bg-transparent border-none text-[10px] text-[#e4e4e4] focus:outline-none cursor-pointer uppercase font-mono"
            >
              <option value="ALL" className="bg-[#0a0a0a]">ALL ROLES</option>
              <option value="ROOT" className="bg-[#0a0a0a]">ROOT</option>
              <option value="ADMIN" className="bg-[#0a0a0a]">ADMIN</option>
              <option value="OPERATOR" className="bg-[#0a0a0a]">OPERATOR</option>
              <option value="REGULAR" className="bg-[#0a0a0a]">REGULAR</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-[#0a0a0a] px-2.5 py-1 border border-[#2a2a2a] rounded-sm">
            <Shield className="h-3 w-3 text-[#6b7280]" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-transparent border-none text-[10px] text-[#e4e4e4] focus:outline-none cursor-pointer uppercase font-mono"
            >
              <option value="ALL" className="bg-[#0a0a0a]">ALL STATUS</option>
              <option value="ACTIVE" className="bg-[#0a0a0a]">ACTIVE</option>
              <option value="INACTIVE" className="bg-[#0a0a0a]">INACTIVE</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center space-x-1 px-2.5 py-1 bg-[#141414] hover:bg-[#1f1f1f] text-[#6b7280] hover:text-[#e4e4e4] border border-[#2a2a2a] rounded-sm text-[10px] uppercase font-mono transition cursor-pointer"
            >
              <X className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}

          <button 
            onClick={handleExportUsers}
            className="flex items-center space-x-1.5 bg-[#141414] hover:bg-[#1f1f1f] text-[#6b7280] hover:text-[#e4e4e4] border border-[#2a2a2a] px-3 py-1 rounded-sm text-xs font-mono uppercase transition cursor-pointer"
          >
            <Download className="h-3 w-3 text-blue-500" />
            <span>Export CSV</span>
          </button>

          <button 
            onClick={openAddForm}
            className="flex items-center space-x-1.5 bg-[#141414] hover:bg-[#1f1f1f] border border-blue-500/50 text-blue-400 hover:text-blue-300 px-3.5 py-1 rounded-sm text-xs font-mono uppercase transition cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span>Create User</span>
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
          <p className="font-mono text-xs text-red-400">{error.message}</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-6 max-w-md mx-auto select-none font-mono">
          <User className="h-8 w-8 text-[#404040] mx-auto mb-2" />
          <h3 className="text-xs font-bold uppercase text-[#e4e4e4] mb-1">No Users Match</h3>
          <p className="text-[#6b7280] text-xs">Adjust search keywords or role filters to find accounts.</p>
        </div>
      ) : (
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm overflow-hidden font-mono">
          {/* Bulk Action Bar */}
          {selectedUsers.size > 0 && (
            <div className="bg-[#141414] border-b border-[#2a2a2a] px-4 py-2 flex items-center justify-between font-mono">
              <span className="text-xs text-blue-400 uppercase">
                {selectedUsers.size} USER(S) SELECTED
              </span>
              <div className="flex items-center space-x-2">
                <button onClick={() => handleBulkAction('activate')} className="text-xs bg-[#141414] hover:bg-[#1f1f1f] text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-sm uppercase transition cursor-pointer">Activate</button>
                <button onClick={() => handleBulkAction('suspend')} className="text-xs bg-[#141414] hover:bg-[#1f1f1f] text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-sm uppercase transition cursor-pointer">Suspend</button>
                <button onClick={() => handleBulkAction('delete')} className="text-xs bg-[#141414] hover:bg-[#1f1f1f] text-red-400 border border-red-500/30 px-2.5 py-1 rounded-sm uppercase transition cursor-pointer">Delete</button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-[#1a1a1a] bg-[#0a0a0a] text-[#6b7280] uppercase tracking-wider select-none">
                  <th className="px-3 py-2.5 w-8 text-center">
                    <input type="checkbox" checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0} onChange={toggleSelectAll} className="rounded-none border-[#2a2a2a] bg-[#0a0a0a] text-blue-500 cursor-pointer" />
                  </th>
                  <th className="px-4 py-2.5">User Identity</th>
                  <th className="px-4 py-2.5 hidden sm:table-cell">Full Name</th>
                  <th className="px-4 py-2.5 hidden md:table-cell">Email Address</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Tools Access</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a] text-[#e4e4e4]">
                {filteredUsers.map((user: any) => {
                  const isSelf = user.username === currentUsername
                  
                  return (
                    <React.Fragment key={user.id}>
                      <tr className={`hover:bg-[#141414] transition-colors ${selectedUsers.has(user.id) ? 'bg-[#141414]' : ''}`}>
                        <td className="px-3 py-2 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedUsers.has(user.id)} 
                            onChange={() => toggleSelectUser(user.id)} 
                            disabled={isSelf}
                            className="rounded-none border-[#2a2a2a] bg-[#0a0a0a] text-blue-500 cursor-pointer disabled:opacity-40" 
                          />
                        </td>
                        {/* Username Column */}
                        <td className="py-2 px-4 font-bold text-[#e4e4e4]">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono">{highlightMatch(user.username, searchQuery)}</span>
                            {isSelf && (
                              <span className="text-[9px] bg-[#141414] text-blue-400 border border-blue-500/30 px-1.5 py-0.2 rounded-sm font-bold select-none uppercase">
                                YOU
                              </span>
                            )}
                          </div>
                        </td>
                        
                        {/* Full Name */}
                        <td className="py-2 px-4 text-[#6b7280] hidden sm:table-cell">
                          {user.first_name || user.last_name ? highlightMatch(`${user.first_name || ''} ${user.last_name || ''}`.trim(), searchQuery) : '—'}
                        </td>
                        
                        {/* Email */}
                        <td className="py-2 px-4 text-[#6b7280] hidden md:table-cell font-mono">
                          {user.email ? highlightMatch(user.email, searchQuery) : '—'}
                        </td>
                        
                        {/* Role Badges */}
                        <td className="py-2 px-4">
                          <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded-sm border uppercase font-mono ${
                            user.role === 'ROOT' 
                              ? 'bg-[#141414] text-purple-400 border-purple-500/30' 
                              : user.role === 'ADMIN'
                              ? 'bg-[#141414] text-blue-400 border-blue-500/30'
                              : user.role === 'OPERATOR'
                              ? 'bg-[#141414] text-amber-400 border-amber-500/30'
                              : 'bg-[#141414] text-[#6b7280] border-[#2a2a2a]'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        
                        {/* Status */}
                        <td className="py-2 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1.5">
                              <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <span className={`text-[11px] uppercase ${user.is_active ? 'text-emerald-400' : 'text-red-400'}`}>
                                {user.is_active ? 'ACTIVE' : 'SUSPENDED'}
                              </span>
                            </div>
                            {user.is_mfa_enabled && (
                              <span className="px-1 py-0.2 text-[8px] font-bold rounded-sm border bg-emerald-950/30 text-emerald-400 border-emerald-500/30 uppercase" title="2-Factor Authentication Enabled">
                                2FA
                              </span>
                            )}
                          </div>
                        </td>
                        
                        {/* Tools Access Badge */}
                        <td className="py-2 px-4">
                          {user.role === 'ROOT' ? (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-sm border bg-[#141414] text-purple-400 border-purple-500/30 font-mono uppercase">
                              ROOT
                            </span>
                          ) : user.is_authorized_for_tools ? (
                            <span 
                              className="px-1.5 py-0.2 text-[9px] font-bold rounded-sm border bg-[#141414] text-emerald-400 border-emerald-500/30 font-mono uppercase cursor-help select-none" 
                              title={user.authorized_tools?.join(', ') || 'None'}
                            >
                              {user.authorized_tools && user.authorized_tools.length > 0
                                ? `${user.authorized_tools.length} MODULES`
                                : 'NO LICENSE'}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-sm border bg-[#141414] text-[#6b7280] border-[#2a2a2a] font-mono uppercase select-none">
                              RESTRICTED
                            </span>
                          )}
                        </td>
                        
                        {/* Action buttons */}
                        <td className="py-2 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button 
                            onClick={() => toggleUserLogs(user.username)}
                            className={`px-2 py-0.5 rounded-sm text-[10px] uppercase font-mono border transition ${
                              expandedUserLogs === user.username
                                ? 'bg-[#141414] text-blue-400 border-blue-500/40'
                                : 'bg-[#141414] hover:bg-[#1f1f1f] text-[#6b7280] hover:text-[#e4e4e4] border-[#2a2a2a]'
                            }`}
                          >
                            {expandedUserLogs === user.username ? 'Hide Logs' : 'Logs'}
                          </button>
                          
                          <button 
                            onClick={() => openEditForm(user)}
                            className="bg-[#141414] hover:bg-[#1f1f1f] text-[#6b7280] hover:text-[#e4e4e4] border border-[#2a2a2a] px-2 py-0.5 rounded-sm text-[10px] uppercase font-mono transition"
                          >
                            Edit
                          </button>
                          
                          <button 
                            onClick={() => handleToggleActive(user)}
                            disabled={isSelf}
                            className={`px-2 py-0.5 rounded-sm text-[10px] uppercase font-mono border transition ${
                              user.is_active 
                                ? 'bg-[#141414] hover:bg-[#1f1f1f] text-amber-400 border-amber-500/30 disabled:opacity-40' 
                                : 'bg-[#141414] hover:bg-[#1f1f1f] text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {user.is_active ? 'Suspend' : 'Activate'}
                          </button>
                          
                          <button 
                            onClick={() => handleDeleteUser(user)}
                            disabled={isSelf}
                            className="bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#6b7280] hover:text-red-400 p-1 rounded-sm text-xs transition disabled:opacity-40 cursor-pointer"
                            title={isSelf ? 'Cannot delete self' : 'Delete user'}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>

                      </tr>
                      
                      {/* Expanded Activity Logs */}
                      {expandedUserLogs === user.username && (
                        <tr>
                          <td colSpan={8} className="p-3 bg-[#0a0a0a] border-t border-b border-[#1a1a1a]">
                            <UserActivityLogSection username={user.username} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#1a1a1a] bg-[#0a0a0a] text-xs select-none">
              <div className="text-[#6b7280] font-mono tabular-nums">
                SHOWING PAGE <span className="font-bold text-[#e4e4e4]">{page}</span> OF <span className="font-bold text-[#e4e4e4]">{totalPages}</span> ({totalCount} USERS)
              </div>
              <div className="flex space-x-1.5 font-mono">
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

      {/* Create / Edit User Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-[#0a0a0a]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono">
          <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-sm max-w-lg w-full shadow-2xl overflow-hidden animate-fadeIn font-mono">
            {/* Modal Header */}
            <div className="bg-[#0a0a0a] py-2.5 px-4 flex justify-between items-center border-b border-[#1a1a1a]">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-blue-400" />
                <h2 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">
                  {editingUser ? `01 CONFIGURE: ${editingUser.username}` : '01 CREATE CREDENTIALS'}
                </h2>
              </div>
              <button onClick={closeForm} className="text-[#6b7280] hover:text-[#e4e4e4] p-0.5 rounded-sm transition cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Scroll Container */}
            <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-4 space-y-3 font-mono">
              {formError && (
                <div className="bg-[#141414] border border-red-500/30 text-red-400 rounded-sm p-2.5 text-xs font-mono flex items-center space-x-2">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Username Input */}
              <div className="space-y-1">
                <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider">Username</label>
                <input 
                  type="text" 
                  required
                  disabled={!!editingUser}
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm px-2.5 py-1.5 text-xs text-[#e4e4e4] placeholder-[#404040] focus:outline-none font-mono disabled:opacity-50"
                  placeholder="e.g. jdoe"
                />
              </div>

              {/* First & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider">First Name</label>
                  <input 
                    type="text" 
                    value={firstNameInput}
                    onChange={(e) => setFirstNameInput(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm px-2.5 py-1.5 text-xs text-[#e4e4e4] placeholder-[#404040] focus:outline-none font-mono"
                    placeholder="John"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider">Last Name</label>
                  <input 
                    type="text" 
                    value={lastNameInput}
                    onChange={(e) => setLastNameInput(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm px-2.5 py-1.5 text-xs text-[#e4e4e4] placeholder-[#404040] focus:outline-none font-mono"
                    placeholder="Doe"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider">
                  Access Key {editingUser && <span className="text-[#404040]">(leave blank to keep current)</span>}
                </label>
                <input 
                  type="password" 
                  required={!editingUser}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm px-2.5 py-1.5 text-xs text-[#e4e4e4] placeholder-[#404040] focus:outline-none font-mono"
                  placeholder={editingUser ? "••••••••" : "Min 8 characters"}
                />
                
                {passwordPolicy && (
                  <div className="text-[9px] text-[#404040]">
                    Password must be at least {passwordPolicy.min_length || 8} characters.
                  </div>
                )}
              </div>

              {/* Verify Current Password (If updating sensitive profile) */}
              {editingUser && editingUser.username === currentUsername && (passwordInput.trim() || emailInput !== editingUser.email) && (
                <div className="space-y-1 bg-[#141414] p-3 border border-red-500/30 rounded-sm">
                  <label className="block text-[10px] text-red-400 uppercase tracking-wider">
                    Verify Profile Identity
                  </label>
                  <input 
                    type="password" 
                    required
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-red-500 rounded-sm px-2.5 py-1.5 text-xs text-[#e4e4e4] focus:outline-none font-mono"
                    placeholder="Enter current password to authorize changes"
                  />
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1">
                <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm px-2.5 py-1.5 text-xs text-[#e4e4e4] placeholder-[#404040] focus:outline-none font-mono"
                  placeholder="john@example.com"
                />
              </div>

              {/* System role dropdown */}
              <div className="space-y-1">
                <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider">System Role</label>
                <select 
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  disabled={editingUser && (editingUser.role === 'ROOT' || editingUser.username === currentUsername)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 disabled:opacity-50 rounded-sm px-2.5 py-1.5 text-xs text-[#e4e4e4] focus:outline-none uppercase font-mono cursor-pointer"
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
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                {/* Active Toggle Box */}
                <div 
                  className={`flex-1 flex items-center justify-between p-2.5 rounded-sm border transition cursor-pointer select-none ${
                    isActiveInput 
                      ? 'border-emerald-500/30 bg-[#141414]' 
                      : 'border-[#2a2a2a] bg-[#0a0a0a]'
                  }`}
                  onClick={() => {
                    if (!(editingUser && editingUser.username === currentUsername)) {
                      setIsActiveInput(!isActiveInput)
                    }
                  }}
                >
                  <div className="space-y-0.5">
                    <span className="block text-xs font-bold text-[#e4e4e4] uppercase">Account Status</span>
                    <span className="block text-[10px] text-[#6b7280]">Active Credentials</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={isActiveInput}
                    disabled={editingUser && editingUser.username === currentUsername}
                    onChange={(e) => setIsActiveInput(e.target.checked)}
                    className="rounded-none border-[#2a2a2a] bg-[#0a0a0a] text-blue-500 cursor-pointer"
                  />
                </div>

                {/* Sizing Tools authorization Box */}
                <div 
                  className={`flex-1 flex items-center justify-between p-2.5 rounded-sm border transition cursor-pointer select-none ${
                    roleInput === 'ROOT' || isAuthorizedForToolsInput 
                      ? 'border-blue-500/30 bg-[#141414]' 
                      : 'border-[#2a2a2a] bg-[#0a0a0a]'
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
                    <span className="block text-xs font-bold text-[#e4e4e4] uppercase">Toolbox Licenses</span>
                    <span className="block text-[10px] text-[#6b7280]">Unlock Modules</span>
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
                    className="rounded-none border-[#2a2a2a] bg-[#0a0a0a] text-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Module Tree Panel */}
              {isAuthorizedForToolsInput && roleInput !== 'ROOT' && (
                <div className="p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm space-y-2">
                  <div className="border-b border-[#1a1a1a] pb-1 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
                      Permission Matrix
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-[#141414] border border-[#2a2a2a] rounded-sm">
                    <div className="flex items-center space-x-2">
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
                        className="rounded-none border-[#2a2a2a] bg-[#0a0a0a] text-blue-500 cursor-pointer"
                      />
                      <label htmlFor="tool-sizing-calculator" className="text-xs text-[#e4e4e4] cursor-pointer uppercase select-none">
                        Sizing & Elongation Calculator
                      </label>
                    </div>
                  </div>

                  <div className="p-2 bg-[#141414] border border-[#2a2a2a] rounded-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
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
                          className="rounded-none border-[#2a2a2a] bg-[#0a0a0a] text-blue-500 cursor-pointer"
                        />
                        <label htmlFor="tool-wire-drawing-calculator" className="text-xs text-[#e4e4e4] cursor-pointer uppercase select-none">
                          Wire Drawing Calculator (Base)
                        </label>
                      </div>
                    </div>

                    <div className="ml-4 pl-3 border-l border-[#2a2a2a] space-y-1.5 pt-1">
                      <div className="flex items-center space-x-2">
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
                          className="rounded-none border-[#2a2a2a] bg-[#0a0a0a] text-purple-500 cursor-pointer"
                        />
                        <label htmlFor="tool-3d-stress-heatmap" className="text-xs text-[#6b7280] hover:text-[#e4e4e4] cursor-pointer uppercase select-none">
                          3D von Mises Stress Heatmap
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
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
                          className="rounded-none border-[#2a2a2a] bg-[#0a0a0a] text-blue-500 cursor-pointer"
                        />
                        <label htmlFor="tool-engineering-theory" className="text-xs text-[#6b7280] hover:text-[#e4e4e4] cursor-pointer uppercase select-none">
                          Theory & Fundamentals Guide
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-[#141414] border border-[#2a2a2a] rounded-sm">
                    <div className="flex items-center space-x-2">
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
                        className="rounded-none border-[#2a2a2a] bg-[#0a0a0a] text-blue-500 cursor-pointer"
                      />
                      <label htmlFor="tool-die-series-generator" className="text-xs text-[#e4e4e4] cursor-pointer uppercase select-none">
                        Die Series Generator
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-[#141414] border border-[#2a2a2a] rounded-sm">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="tool-die-set-planner"
                        checked={authorizedToolsInput.includes('die-set-planner')}
                        onChange={() => {
                          const isChecked = authorizedToolsInput.includes('die-set-planner');
                          setAuthorizedToolsInput(prev =>
                            isChecked ? prev.filter(id => id !== 'die-set-planner') : [...prev, 'die-set-planner']
                          );
                        }}
                        className="rounded-none border-[#2a2a2a] bg-[#0a0a0a] text-blue-500 cursor-pointer"
                      />
                      <label htmlFor="tool-die-set-planner" className="text-xs text-[#e4e4e4] cursor-pointer uppercase select-none">
                        Die Set Planner
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="border-t border-[#1a1a1a] pt-3 flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={closeForm}
                  className="bg-[#141414] hover:bg-[#1f1f1f] text-[#6b7280] hover:text-[#e4e4e4] border border-[#2a2a2a] px-3.5 py-1 rounded-sm text-xs font-mono uppercase transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                  className="bg-[#141414] hover:bg-[#1f1f1f] text-blue-400 hover:text-blue-300 border border-blue-500/50 px-4 py-1 rounded-sm text-xs font-mono uppercase transition cursor-pointer"
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
        open={!!userToDelete}
        title="Delete User Account"
        message={`Are you sure you want to permanently delete user "${userToDelete?.username}"? All associated settings and activity history will be removed.`}
        confirmLabel="Delete User"
        danger={true}
        onConfirm={() => {
          if (userToDelete) {
            deleteUserMutation.mutate(userToDelete.id)
            setUserToDelete(null)
          }
        }}
        onCancel={() => setUserToDelete(null)}
      />

      {/* Bulk Action Confirmation */}
      <ConfirmDialog
        open={!!bulkActionType}
        title={`Bulk ${bulkActionType ? bulkActionType.charAt(0).toUpperCase() + bulkActionType.slice(1) : ''} Users`}
        message={`Are you sure you want to ${bulkActionType} ${selectedUsers.size} selected user(s)?`}
        confirmLabel={`Confirm ${bulkActionType ? bulkActionType.charAt(0).toUpperCase() + bulkActionType.slice(1) : ''}`}
        danger={bulkActionType === 'delete' || bulkActionType === 'suspend'}
        onConfirm={() => {
          if (bulkActionType) {
            bulkActionMutation.mutate({ action: bulkActionType, user_ids: Array.from(selectedUsers) })
          }
        }}
        onCancel={() => setBulkActionType(null)}
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
      <div className="flex justify-center items-center py-4">
        <div className="animate-spin h-4 w-4 border border-[#2a2a2a] border-t-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-xs py-2 font-mono text-red-400">
        Failed to load activity logs: {error.message}
      </div>
    )
  }

  const results = logs?.results || logs || []

  if (results.length === 0) {
    return (
      <div className="text-center text-xs text-[#6b7280] py-2 font-mono">
        No activity logs recorded for this user.
      </div>
    )
  }

  return (
    <div className="space-y-2 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-1">
        <span className="text-[10px] text-[#6b7280] uppercase tracking-wider">User Audit Trail</span>
        <span className="text-[10px] text-[#6b7280] tabular-nums">{results.length} ENTRIES</span>
      </div>

      <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
        {results.map((log: any) => {
          const client = parseUserAgent(log.device)
          
          return (
            <div key={log.id} className="flex justify-between items-start gap-2 p-2 bg-[#141414] border border-[#1a1a1a] rounded-sm">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded-sm border uppercase ${
                    log.action === 'LOGIN'
                      ? 'bg-[#141414] text-emerald-400 border-emerald-500/30'
                      : log.action === 'FAILED_LOGIN'
                      ? 'bg-[#141414] text-red-400 border-red-500/30'
                      : 'bg-[#141414] text-[#6b7280] border-[#2a2a2a]'
                  }`}>
                    {log.action}
                  </span>
                  {log.ip_address && (
                    <span className="text-[10px] text-[#6b7280] font-mono">IP: {log.ip_address}</span>
                  )}
                </div>
                {log.device && (
                  <div className="flex items-center space-x-1 text-[10px] text-[#6b7280] mt-0.5">
                    {client.deviceType === 'mobile' ? (
                      <Smartphone className="h-3 w-3 shrink-0" />
                    ) : (
                      <Monitor className="h-3 w-3 shrink-0" />
                    )}
                    <span className="truncate max-w-[250px]">{client.label}</span>
                  </div>
                )}
              </div>
              <span className="text-[9px] text-[#6b7280] whitespace-nowrap tabular-nums">
                {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
