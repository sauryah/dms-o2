import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Database, Trash2, Upload, Download, AlertTriangle, X } from 'lucide-react'
import { useApi, useAuth, useToast } from '../../App'

export function BackupManager() {
  const { request } = useApi()
  const { showToast } = useToast()
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const [selectedBackup, setSelectedBackup] = useState<any>(null)
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false)
  const [restoreConfirmInput, setRestoreConfirmInput] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // Fetch Backups
  const { data: backups, isLoading: isBackupsLoading, error: backupsError } = useQuery({
    queryKey: ['backupsList'],
    queryFn: () => request('/api/backups/')
  })

  // Create Backup Mutation
  const createBackupMutation = useMutation({
    mutationFn: () => request('/api/backups/', {
      method: 'POST'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backupsList'] })
      showToast('Backup created successfully', 'success')
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

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
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
      </div>

      {isBackupsLoading ? (
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
              <p className="text-slate-404 text-sm mb-6 leading-relaxed">
                Upload an offline database backup archive file (`.dump`) to make it available for restore.
              </p>
              <div 
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
                  isUploading 
                    ? 'border-blue-500/50 bg-blue-500/5' 
                    : 'border-slate-800 hover:border-blue-500/50 bg-slate-950/20 hover:bg-slate-955/40'
                }`}
                onClick={() => !isUploading && document.getElementById('backup-file-input-manager')?.click()}
              >
                {isUploading ? (
                  <RefreshCw className="h-10 w-10 text-blue-500 mx-auto mb-4 animate-spin" />
                ) : (
                  <Upload className="h-10 w-10 text-slate-500 mx-auto mb-4" />
                )}
                <span className="text-sm font-bold text-slate-200 block">
                  {isUploading ? 'Uploading Dump File...' : 'Click to Upload Backup'}
                </span>
                <span className="text-xs text-slate-500 mt-2 block">
                  Only accepts `.dump` format
                </span>
                <input 
                  type="file" 
                  id="backup-file-input-manager" 
                  accept=".dump"
                  className="hidden"
                  disabled={isUploading}
                  onChange={handleUploadFile}
                />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wider text-slate-400">Nightly Backups</h4>
              <p className="text-slate-400 text-xs leading-relaxed font-sans">
                The system automatically takes a full database snapshot nightly at 2:00 AM. 
                Backups older than 14 days are auto-pruned to conserve disk space.
              </p>
            </div>
          </div>

          {/* Right Column: Backups List */}
          <div className="lg:col-span-2">
            {!Array.isArray(backups) || backups.length === 0 ? (
              <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl h-full flex flex-col justify-center items-center">
                <Database className="h-12 w-12 text-slate-650 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No backups found</h3>
                <p className="text-slate-400 max-w-md mx-auto mb-8">
                  No database backup files exist in the `/backups` directory on the server.
                </p>
                <button
                  onClick={() => createBackupMutation.mutate()}
                  disabled={createBackupMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-semibold transition disabled:opacity-50 inline-flex items-center space-x-2 shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20"
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
                              <Database className="h-4 w-4 text-slate-500" />
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
      )}

      {/* Database Restore Double Confirmation Modal */}
      {showRestoreConfirmModal && selectedBackup && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center space-x-2 text-rose-400">
                <AlertTriangle className="h-5 w-5" />
                <h2 className="text-xl font-bold text-white">Confirm Database Restore</h2>
              </div>
              <button 
                onClick={() => {
                  setShowRestoreConfirmModal(false)
                  setSelectedBackup(null)
                }} 
                className="text-slate-400 hover:text-white"
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
                  <Database className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <span>{selectedBackup.filename}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Type <span className="text-rose-400 font-bold">RESTORE</span> to confirm:
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
                  className="bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800/40 disabled:text-rose-400/50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition shadow-md shadow-rose-500/10 hover:shadow-rose-500/20 disabled:shadow-none inline-flex items-center space-x-2"
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
