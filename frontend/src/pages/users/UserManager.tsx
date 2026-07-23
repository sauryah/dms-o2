import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useApi } from '../../hooks/useApi'
import { ConfirmDialog } from '../../components/ConfirmDialog'

export function UserManager() {
  const { request } = useApi()
  const { showToast } = useToast()
  const { username: currentUsername } = useAuth()
  const queryClient = useQueryClient()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [expandedUserLogs, setExpandedUserLogs] = useState<string | null>(null)
  
  const toggleUserLogs = (username: string) => {
    if (expandedUserLogs === username) {
      setExpandedUserLogs(null)
    } else {
      setExpandedUserLogs(username)
    }
  }
  
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
  const { data: users, isLoading, error } = useQuery({
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

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button 
          onClick={openAddForm}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-3 rounded-xl font-semibold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300"
        >
          <Plus className="h-5 w-5" />
          <span>Create User</span>
        </button>
      </div>

      {isLoading ? (
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
                <tr className="border-b border-slate-800 bg-slate-955/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4.5 px-6">Username</th>
                  <th className="py-4.5 px-6 hidden sm:table-cell">Full Name</th>
                  <th className="py-4.5 px-6 hidden md:table-cell">Email</th>
                  <th className="py-4.5 px-6">Role</th>
                  <th className="py-4.5 px-6">Status</th>
                  <th className="py-4.5 px-6">Tools Access</th>
                  <th className="py-4.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users?.map((user: any) => {
                  const isSelf = user.username === currentUsername
                  return (
                    <React.Fragment key={user.id}>
                      <tr className="hover:bg-slate-850/30 transition-colors duration-200">
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
                      <td className="py-4 px-6">
                        {user.role === 'ROOT' ? (
                          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full border bg-purple-500/10 text-purple-400 border-purple-500/20">
                            All Tools
                          </span>
                        ) : user.is_authorized_for_tools ? (
                          <span 
                            className="px-2.5 py-0.5 text-xs font-semibold rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20 cursor-help" 
                            title={user.authorized_tools && user.authorized_tools.length > 0
                              ? user.authorized_tools.map((t: string) => {
                                  if (t === 'sizing-calculator') return 'Sizing'
                                  if (t === 'wire-drawing-calculator') return 'Wire Drawing'
                                  return t
                                }).join(', ')
                              : 'None'}
                          >
                            {user.authorized_tools && user.authorized_tools.length > 0
                              ? `${user.authorized_tools.length} Tool${user.authorized_tools.length > 1 ? 's' : ''}`
                              : 'No Tools'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full border bg-slate-500/10 text-slate-400 border-slate-500/20">
                            Unauthorized
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                        <button 
                          onClick={() => toggleUserLogs(user.username)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                            expandedUserLogs === user.username
                              ? 'bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border-blue-500/20'
                              : 'bg-slate-955 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                          }`}
                          title="View user activity logs"
                        >
                          {expandedUserLogs === user.username ? 'Hide Logs' : 'Logs'}
                        </button>
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
                          className="bg-rose-500/5 hover:bg-rose-500/15 text-rose-500 hover:text-rose-400 border border-rose-500/10 p-2 rounded-xl text-xs transition disabled:opacity-40"
                          title={isSelf ? 'You cannot delete yourself' : 'Delete user'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                    {expandedUserLogs === user.username && (
                      <tr>
                        <td colSpan={7} className="p-0 bg-slate-950/20">
                          <div className="px-6 py-4.5 border-t border-b border-slate-800/50 bg-slate-950/30">
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                {editingUser ? `Edit User: ${editingUser.username}` : 'Create Administrative User'}
              </h2>
              <button onClick={closeForm} className="text-slate-404 hover:text-white">
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
                  className="w-full bg-slate-955 border border-slate-800 focus:border-blue-500 disabled:opacity-50 disabled:bg-slate-955 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-404 uppercase tracking-wider mb-2">First Name</label>
                  <input 
                    type="text" 
                    value={firstNameInput}
                    onChange={(e) => setFirstNameInput(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-404 uppercase tracking-wider mb-2">Last Name</label>
                  <input 
                    type="text" 
                    value={lastNameInput}
                    onChange={(e) => setLastNameInput(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-404 uppercase tracking-wider mb-2">
                  Password {editingUser && <span className="text-slate-505 font-normal capitalize">(leave blank to keep current)</span>}
                </label>
                <input 
                  type="password" 
                  required={!editingUser}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-955 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                />
              </div>

              {editingUser && editingUser.username === currentUsername && (passwordInput.trim() || emailInput !== editingUser.email) && (
                <div>
                  <label className="block text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2">
                    Current Password <span className="text-slate-500 font-normal capitalize">(required to save changes)</span>
                  </label>
                  <input 
                    type="password" 
                    required
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    className="w-full bg-slate-955 border border-rose-800/40 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none placeholder-rose-900/30"
                    placeholder="Enter current password to verify"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-404 uppercase tracking-wider mb-2">Email</label>
                <input 
                  type="email" 
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-slate-955 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-404 uppercase tracking-wider mb-2">Role</label>
                <select 
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  disabled={editingUser && (editingUser.role === 'ROOT' || editingUser.username === currentUsername)}
                  className="w-full bg-slate-955 border border-slate-800 focus:border-blue-500 disabled:opacity-50 disabled:bg-slate-955 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                >
                  {roleInput === 'ROOT' && (
                    <option value="ROOT">Root (Superuser)</option>
                  )}
                  <option value="REGULAR">Regular (Read-Only)</option>
                  <option value="OPERATOR">Operator (Relocation)</option>
                  <option value="ADMIN">Admin (Read-Write)</option>
                </select>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <input 
                  type="checkbox"
                  id="user-active-checkbox-manager"
                  checked={isActiveInput}
                  onChange={(e) => setIsActiveInput(e.target.checked)}
                  disabled={editingUser && editingUser.username === currentUsername}
                  className="h-4.5 w-4.5 bg-slate-955 border border-slate-800 rounded focus:ring-0 text-blue-500"
                />
                <label htmlFor="user-active-checkbox-manager" className="text-sm font-semibold text-slate-300 cursor-pointer">
                  Is Account Active
                </label>
              </div>

              <div className="flex items-center space-x-3 pt-1">
                <input 
                  type="checkbox"
                  id="user-tools-authorized-checkbox"
                  checked={roleInput === 'ROOT' || isAuthorizedForToolsInput}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setIsAuthorizedForToolsInput(checked)
                    if (checked && authorizedToolsInput.length === 0) {
                      setAuthorizedToolsInput(['sizing-calculator', 'wire-drawing-calculator'])
                    }
                  }}
                  disabled={roleInput === 'ROOT'}
                  className="h-4.5 w-4.5 bg-slate-955 border border-slate-800 rounded focus:ring-0 text-blue-500 disabled:opacity-50"
                />
                <label htmlFor="user-tools-authorized-checkbox" className="text-sm font-semibold text-slate-300 cursor-pointer">
                  Authorized for Sizing Tools
                </label>
              </div>

              {isAuthorizedForToolsInput && roleInput !== 'ROOT' && (
                <div className="pl-4 space-y-3 border-l-2 border-slate-800 ml-2 pt-2 animate-fadeIn text-xs">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Tool & Feature Access Tree
                  </span>

                  {/* Top-Level Tool 1: Sizing Calculator */}
                  <div className="flex items-center space-x-3 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
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
                      className="h-4 w-4 bg-slate-955 border border-slate-700 rounded text-blue-500 cursor-pointer"
                    />
                    <label htmlFor="tool-sizing-calculator" className="font-semibold text-slate-200 cursor-pointer select-none">
                      Sizing & Elongation Calculator
                    </label>
                  </div>

                  {/* Top-Level Tool 2: Wire Drawing Calculator */}
                  <div className="space-y-2 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
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
                        className="h-4 w-4 bg-slate-955 border border-slate-700 rounded text-blue-500 cursor-pointer"
                      />
                      <label htmlFor="tool-wire-drawing-calculator" className="font-semibold text-slate-200 cursor-pointer select-none">
                        Wire Drawing Calculator (Base Workbench)
                      </label>
                    </div>

                    {/* Sub-Features Tree Indented Right */}
                    <div className="ml-6 pl-3.5 border-l-2 border-purple-500/40 space-y-2 pt-1 mt-1">
                      <span className="block text-[9px] font-mono font-bold uppercase tracking-wider text-purple-400">
                        ↳ Sub-Feature Module Locks (Wire Drawing)
                      </span>

                      {/* Sub-feature 1: 3D Stress Heatmap */}
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
                          className="h-3.5 w-3.5 bg-slate-955 border border-slate-700 rounded text-purple-500 cursor-pointer"
                        />
                        <label htmlFor="tool-3d-stress-heatmap" className="text-xs text-slate-300 hover:text-white cursor-pointer select-none flex items-center gap-1.5">
                          <span>3D von Mises Stress Heatmap</span>
                          <span className="text-[9px] font-mono text-purple-400 bg-purple-950/60 border border-purple-800/50 px-1.5 py-0.5 rounded font-bold">
                            3D Model
                          </span>
                        </label>
                      </div>

                      {/* Sub-feature 2: Theory & Fundamentals */}
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
                          className="h-3.5 w-3.5 bg-slate-955 border border-slate-700 rounded text-indigo-500 cursor-pointer"
                        />
                        <label htmlFor="tool-engineering-theory" className="text-xs text-slate-300 hover:text-white cursor-pointer select-none flex items-center gap-1.5">
                          <span>Theory & Fundamentals Guide</span>
                          <span className="text-[9px] font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-800/50 px-1.5 py-0.5 rounded font-bold">
                            Theory Docs
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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

      <ConfirmDialog
        isOpen={!!userToDelete}
        title="Delete User Account"
        message={`Are you sure you want to permanently delete user "${userToDelete?.username}"? All associated settings for this account will be removed.`}
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
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-xs text-rose-400 font-medium py-4">
        Failed to load activity logs: {error.message}
      </div>
    )
  }

  const results = logs?.results || logs || []

  if (results.length === 0) {
    return (
      <div className="text-center text-xs text-slate-500 py-4 font-medium">
        No activity logs recorded for this user.
      </div>
    )
  }

  return (
    <div className="space-y-3 animate-fadeIn text-left">
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Activity Logs</span>
        <span className="text-[10px] text-slate-500 font-mono">{results.length} records</span>
      </div>
      <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {results.map((log: any) => (
          <div key={log.id} className="flex justify-between items-start gap-4 p-3 bg-slate-900 border border-slate-850 rounded-xl text-xs hover:border-slate-800 transition">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                  log.action === 'LOGIN'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : log.action === 'FAILED_LOGIN'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                }`}>
                  {log.action}
                </span>
                {log.ip_address && (
                  <span className="text-[10px] text-slate-500 font-mono">IP: {log.ip_address}</span>
                )}
              </div>
              {log.device && (
                <p className="text-[10px] text-slate-500 mt-1.5 truncate max-w-md md:max-w-xl" title={log.device}>
                  {log.device}
                </p>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
              {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
