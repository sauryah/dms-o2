import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Database, Trash2, Upload, Download, AlertTriangle, X, Calendar, Clock, ShieldCheck, Info } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useApi } from '../../hooks/useApi'
import { ConfirmDialog } from '../../components/ConfirmDialog'

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
    <div className="space-y-8">
      {/* Top Section: Action hub cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
        
        {/* Card A: Create Database Snapshot */}
        <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-blue-400" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Database Snapshot Tool</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Instantly compile and export the current state of the database (dies, inventory metrics, history logs, machines) into a secure PostgreSQL binary archive.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <button 
              onClick={() => createBackupMutation.mutate()}
              disabled={createBackupMutation.isPending}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-semibold text-xs tracking-wider uppercase transition shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              {createBackupMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Plus className="h-4 w-4 text-white" />
              )}
              <span>{createBackupMutation.isPending ? 'Writing Snapshot...' : 'Create Backup Now'}</span>
            </button>

            {/* Nightly alert banner */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#070d19]/60 border border-slate-900 text-xs font-sans leading-normal">
              <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-350">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Autonomic Backup Scheduler</span>
                </div>
                <p className="text-slate-500">
                  System executes database dumps nightly at 2:00 AM. Archives older than 14 days are auto-pruned to preserve disk volumes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card B: Upload Offline Backup */}
        <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Upload className="h-4 w-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Ingest Dump Archive</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Load an offline database backup file (`.dump`) into the server storage to make it available for immediate system restores.
            </p>
          </div>

          <div 
            className={`border border-dashed rounded-lg p-5 text-center cursor-pointer transition-all duration-300 ${
              isUploading 
                ? 'border-blue-500/50 bg-blue-500/5' 
                : 'border-slate-800 hover:border-blue-500/40 bg-[#03060c] hover:bg-[#040810]'
            }`}
            onClick={() => !isUploading && document.getElementById('backup-file-input-manager')?.click()}
          >
            {isUploading ? (
              <RefreshCw className="h-6 w-6 text-blue-400 mx-auto mb-2 animate-spin" />
            ) : (
              <Upload className="h-6 w-6 text-slate-500 mx-auto mb-2" />
            )}
            <span className="text-xs font-bold text-slate-300 block">
              {isUploading ? 'Uploading Archive File...' : 'Click to Upload Backup'}
            </span>
            <span className="text-xs text-slate-550 font-mono mt-1 block uppercase">
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

      </div>

      {/* Backups List Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-900/60 select-none">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Stored Snapshots</h4>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {backups && Array.isArray(backups) ? `${backups.length} archives available` : '0 archives'}
          </span>
        </div>

        {isBackupsLoading ? (
          <div className="flex justify-center items-center py-16 bg-[#04070d]/30 border border-slate-900 rounded-xl">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
          </div>
        ) : backupsError ? (
          <div className="text-center py-8 bg-rose-500/5 border border-rose-500/20 rounded-xl p-6 font-mono text-xs text-rose-400">
            Error loading backups index: {backupsError.message}
          </div>
        ) : !Array.isArray(backups) || backups.length === 0 ? (
          <div className="text-center py-16 bg-[#04070d]/30 border border-slate-900 rounded-xl p-8 flex flex-col justify-center items-center">
            <Database className="h-8 w-8 text-slate-750 mb-3" />
            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">No backups index found</h5>
            <p className="text-xs text-slate-550 max-w-sm mx-auto">
              No database backup files exist in the `/backups` directory on the server volume.
            </p>
          </div>
        ) : (
          <div className="bg-slate-950/40 border border-slate-900 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 bg-[#040810]/60 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-5 font-mono">Backup File</th>
                    <th className="py-3.5 px-5 font-mono">Date Created</th>
                    <th className="py-3.5 px-5 font-mono">Size</th>
                    <th className="py-3.5 px-5 font-mono text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 font-mono text-xs">
                  {backups.map((backup: any) => {
                    const dateStr = new Date(backup.created_at).toLocaleString()
                    
                    return (
                      <tr key={backup.filename} className="hover:bg-slate-900/20 transition-colors duration-150">
                        <td className="py-3.5 px-5 font-semibold text-slate-200">
                          <div className="flex items-center space-x-2.5">
                            <Database className="h-3.5 w-3.5 text-blue-500/80 shrink-0" />
                            <span className="break-all">{backup.filename}</span>
                          </div>
                        </td>
                        
                        <td className="py-3.5 px-5 text-slate-450">
                          <div className="flex items-center space-x-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-600" />
                            <span>{dateStr}</span>
                          </div>
                        </td>
                        
                        <td className="py-3.5 px-5">
                          <span className="bg-blue-950/20 text-blue-400 border border-blue-900/30 px-2 py-0.5 rounded text-[11px] font-bold">
                            {backup.size_kb >= 1024 
                              ? `${(backup.size_kb / 1024).toFixed(2)} MB` 
                              : `${backup.size_kb.toFixed(1)} KB`}
                          </span>
                        </td>
                        
                        <td className="py-3.5 px-5 text-right space-x-1 whitespace-nowrap">
                          {/* Download Button */}
                          <button
                            onClick={() => handleDownloadBackup(backup.filename)}
                            className="bg-[#03060c] hover:bg-[#070d19] text-slate-400 hover:text-cyan-400 border border-slate-900 p-1.5 rounded transition cursor-pointer"
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
                            className="bg-emerald-950/20 hover:bg-emerald-900/40 text-emerald-450 border border-emerald-900/30 px-3 py-1.5 rounded text-[11px] font-bold tracking-wider uppercase transition cursor-pointer"
                            title="Restore database to this state"
                          >
                            Restore
                          </button>
                          
                          {/* Delete Button */}
                          <button
                            onClick={() => setBackupToDelete(backup.filename)}
                            disabled={deleteBackupMutation.isPending}
                            className="bg-[#03060c] hover:bg-rose-950/20 text-slate-450 hover:text-rose-400 border border-slate-900 p-1.5 rounded transition disabled:opacity-40 cursor-pointer"
                            title="Delete backup from disk"
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
