import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Database, Trash2, Upload, Download, AlertTriangle, Calendar, ShieldCheck, Info } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useApi } from '../../hooks/useApi'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'

export function BackupManager() {
  const { request } = useApi()
  const { showToast } = useToast()
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const [selectedBackup, setSelectedBackup] = useState<any>(null)
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [backupToDelete, setBackupToDelete] = useState<string | null>(null)

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
      showToast('Database snapshot created successfully', 'success')
    },
    onError: (err) => {
      showToast(err.message || 'Failed to create database snapshot', 'error')
    }
  })

  // Delete Backup Mutation
  const deleteBackupMutation = useMutation({
    mutationFn: (filename: any) => request('/api/backups/delete_backup/', {
      method: 'POST',
      body: JSON.stringify({ filename })
    }),
    onSuccess: () => {
      showToast('Backup archive deleted successfully', 'success')
      queryClient.invalidateQueries({ queryKey: ['backupsList'] })
    },
    onError: (err) => {
      showToast(err.message || 'Failed to delete backup file', 'error')
    }
  })

  // Restore Backup Mutation
  const restoreBackupMutation = useMutation({
    mutationFn: (filename: any) => request('/api/backups/restore/', {
      method: 'POST',
      body: JSON.stringify({ filename })
    }),
    onSuccess: () => {
      showToast('Database restore initiated. Processing tasks...', 'success')
      setShowRestoreConfirmModal(false)
      setSelectedBackup(null)
    },
    onError: (err) => {
      showToast(err.message || 'Restore procedure failed', 'error')
    }
  })

  const handleDownloadBackup = async (filename: string) => {
    try {
      const res = await fetch(`/api/v1/backups/download_backup/?filename=${encodeURIComponent(filename)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!res.ok) throw new Error('Download failed')
      
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
      showToast('Failed to download backup file', 'error')
    }
  }

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.dump')) {
      showToast('Only .dump PostgreSQL database dumps are allowed', 'error')
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
      showToast(err.message || 'Failed to upload backup archive', 'error')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-8 select-none font-sans">
      {/* Top Section: Action hub cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card A: Create Database Snapshot */}
        <div className="relative group overflow-hidden bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-blue-500/30 hover:shadow-blue-950/10">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10 transition-all" />
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 bg-blue-500/10 border border-blue-500/25 text-blue-450 rounded-lg">
                <Database className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Database Snapshot Tool</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Compile and export the current database state (dies, physical layout, history logs, machine configurations) into a secure PostgreSQL custom-format archive.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <button 
              onClick={() => createBackupMutation.mutate()}
              disabled={createBackupMutation.isPending}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 rounded-xl font-semibold text-xs tracking-wider uppercase transition shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-40 cursor-pointer"
            >
              {createBackupMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Plus className="h-4 w-4 text-white" />
              )}
              <span>{createBackupMutation.isPending ? 'Writing Snapshot...' : 'Create Backup Now'}</span>
            </button>

            {/* Nightly alert banner */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs">
              <Info className="h-4 w-4 text-blue-450 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono">Autonomic Scheduler Active</span>
                </div>
                <p className="text-slate-400">
                  Daily database dumps execute at 2:00 AM. Archives older than 14 days are auto-pruned.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card B: Upload Offline Backup */}
        <div className="relative group overflow-hidden bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-indigo-500/30 hover:shadow-indigo-950/10">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-all" />
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/25 text-indigo-450 rounded-lg">
                <Upload className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Ingest Dump Archive</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Load an offline database backup file (`.dump`) into the system volume to make it available for immediate state restoration.
            </p>
          </div>

          <div 
            className={`border border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-350 ${
              isUploading 
                ? 'border-blue-500/50 bg-blue-500/5 shadow-[0_0_15px_rgba(59,130,246,0.05)]' 
                : 'border-slate-800 hover:border-blue-500/40 bg-slate-950/50 hover:bg-slate-950/90'
            }`}
            onClick={() => !isUploading && document.getElementById('backup-file-input-manager')?.click()}
          >
            {isUploading ? (
              <RefreshCw className="h-6 w-6 text-blue-450 mx-auto mb-2 animate-spin" />
            ) : (
              <Upload className="h-6 w-6 text-slate-500 mx-auto mb-2 group-hover:text-slate-400 transition" />
            )}
            <span className="text-xs font-bold text-slate-200 block">
              {isUploading ? 'Uploading Archive File...' : 'Click to Select Backup File'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block uppercase">
              Accepts ONLY `.dump` Format
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

      </div>

      {/* Backups List Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-emerald-450" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Stored Snapshots Registry</h4>
          </div>
          <span className="text-xs text-slate-450 font-mono">
            {backups && Array.isArray(backups) ? `${backups.length} archives available` : '0 archives'}
          </span>
        </div>

        {isBackupsLoading ? (
          <div className="space-y-3 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-4 items-center justify-between">
                <div className="h-4 w-1/3 bg-slate-800 rounded animate-pulse" />
                <div className="h-4 w-1/4 bg-slate-800 rounded animate-pulse" />
                <div className="h-8 w-24 bg-slate-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : backupsError ? (
          <div className="text-center py-8 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 font-mono text-xs text-rose-450">
            Error loading backups index: {backupsError.message}
          </div>
        ) : !Array.isArray(backups) || backups.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 flex flex-col justify-center items-center">
            <Database className="h-10 w-10 text-slate-700 mb-3" />
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">No backups index found</h5>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No database backup files exist in the `/backups` directory on the server volume.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
            <div className="overflow-x-auto max-h-[450px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md text-slate-450 text-xs font-bold uppercase tracking-wider">
                    <th className="py-4 px-6 font-mono">Backup File</th>
                    <th className="py-4 px-6 font-mono">Date Created</th>
                    <th className="py-4 px-6 font-mono">Size</th>
                    <th className="py-4 px-6 font-mono text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60 font-mono text-xs text-slate-300">
                  <AnimatePresence>
                    {backups.map((backup: any) => {
                      const dateStr = new Date(backup.created_at).toLocaleString()
                      
                      return (
                        <tr 
                          key={backup.filename} 
                          className="hover:bg-slate-850/20 transition-colors duration-150"
                        >
                          <td className="py-3.5 px-6 font-semibold text-slate-200">
                            <div className="flex items-center space-x-2.5">
                              <Database className="h-3.5 w-3.5 text-blue-500/70 shrink-0" />
                              <span className="break-all">{backup.filename}</span>
                            </div>
                          </td>
                          
                          <td className="py-3.5 px-6 text-slate-400">
                            <div className="flex items-center space-x-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-655" />
                              <span>{dateStr}</span>
                            </div>
                          </td>
                          
                          <td className="py-3.5 px-6">
                            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                              {backup.size_kb >= 1024 
                                ? `${(backup.size_kb / 1024).toFixed(2)} MB` 
                                : `${backup.size_kb.toFixed(1)} KB`}
                            </span>
                          </td>
                          
                          <td className="py-3.5 px-6 text-right space-x-2 whitespace-nowrap">
                            {/* Download Button */}
                            <button
                              onClick={() => handleDownloadBackup(backup.filename)}
                              className="bg-slate-950/40 hover:bg-cyan-500/10 text-slate-400 hover:text-cyan-400 border border-slate-800/80 p-1.5 rounded-xl transition cursor-pointer"
                              title="Download dump file (.dump)"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                            
                            {/* Restore Button */}
                            <button
                              onClick={() => {
                                setSelectedBackup(backup)
                                setShowRestoreConfirmModal(true)
                              }}
                              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-450 border border-emerald-500/20 hover:border-emerald-500/30 px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider uppercase transition cursor-pointer"
                              title="Restore database to this state"
                            >
                              Restore
                            </button>
                            
                            {/* Delete Button */}
                            <button
                              onClick={() => setBackupToDelete(backup.filename)}
                              disabled={deleteBackupMutation.isPending}
                              className="bg-slate-955/40 hover:bg-rose-500/10 text-slate-450 hover:text-rose-455 border border-slate-800/80 p-1.5 rounded-xl transition disabled:opacity-40 cursor-pointer"
                              title="Delete backup from disk"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={!!backupToDelete}
        title="Delete Backup File"
        message={`Are you sure you want to permanently delete backup "${backupToDelete}" from the server disk? This action is irreversible.`}
        confirmText="Delete Backup"
        isDestructive={true}
        onConfirm={() => {
          if (backupToDelete) {
            deleteBackupMutation.mutate(backupToDelete)
            setBackupToDelete(null)
          }
        }}
        onCancel={() => setBackupToDelete(null)}
      />

      <ConfirmDialog
        isOpen={showRestoreConfirmModal && !!selectedBackup}
        title="Confirm Database Overwrite"
        message="CRITICAL WARNING: Restoring the database will completely overwrite all current files, die status calibrations, machine set configurations, and user accounts. All data created since this backup dump was generated will be permanently lost."
        confirmText="Execute Restore"
        isDestructive={true}
        requireMatchText="RESTORE"
        onConfirm={() => {
          if (selectedBackup) {
            restoreBackupMutation.mutate(selectedBackup.filename)
          }
        }}
        onCancel={() => {
          setShowRestoreConfirmModal(false)
          setSelectedBackup(null)
        }}
      />
    </div>
  )
}

