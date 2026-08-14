import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Database, Trash2, Upload, Download, Calendar, ShieldCheck, Info } from 'lucide-react'
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
    <div className="space-y-6 select-none font-mono">
      {/* Top Section: Action hub cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Card A: Create Database Snapshot */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 flex flex-col justify-between space-y-4 font-mono">
          <div>
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#1a1a1a]">
              <div className="p-1 bg-[#141414] border border-[#2a2a2a] text-blue-400 rounded-sm">
                <Database className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">01 SNAPSHOT CREATION</h3>
            </div>
            <p className="text-xs text-[#6b7280] leading-normal">
              Compile current system state (dies, physical layout, history logs, machine configurations) into PostgreSQL archive.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <button 
              onClick={() => createBackupMutation.mutate()}
              disabled={createBackupMutation.isPending}
              className="w-full flex items-center justify-center space-x-1.5 bg-[#141414] hover:bg-[#1f1f1f] border border-blue-500/50 text-blue-400 hover:text-blue-300 py-2 rounded-sm text-xs font-mono uppercase transition disabled:opacity-40 cursor-pointer"
            >
              {createBackupMutation.isPending ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              <span>{createBackupMutation.isPending ? 'Writing Snapshot...' : 'Create Backup Now'}</span>
            </button>

            {/* Nightly alert banner */}
            <div className="flex items-start gap-2 p-2.5 rounded-sm bg-[#0a0a0a] border border-[#1a1a1a] text-xs">
              <Info className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 font-bold text-[#e4e4e4] text-[10px] uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>AUTONOMIC SCHEDULER ACTIVE</span>
                </div>
                <p className="text-[#6b7280] text-[10px]">
                  Daily dumps run at 02:00 UTC. Snapshots older than 14 days auto-pruned.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card B: Upload Offline Backup */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 flex flex-col justify-between space-y-4 font-mono">
          <div>
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#1a1a1a]">
              <div className="p-1 bg-[#141414] border border-[#2a2a2a] rounded-sm text-purple-400">
                <Upload className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">02 INGEST DUMP ARCHIVE</h3>
            </div>
            <p className="text-xs text-[#6b7280] leading-normal">
              Load an offline backup file (.dump) into storage volume to make available for state restoration.
            </p>
          </div>

          <div 
            className={`border border-dashed rounded-sm p-4 text-center cursor-pointer transition-colors ${
              isUploading 
                ? 'border-blue-500 bg-[#141414]' 
                : 'border-[#2a2a2a] hover:border-blue-500/50 bg-[#0a0a0a]'
            }`}
            onClick={() => !isUploading && document.getElementById('backup-file-input-manager')?.click()}
          >
            {isUploading ? (
              <RefreshCw className="h-5 w-5 text-blue-400 mx-auto mb-1 animate-spin" />
            ) : (
              <Upload className="h-5 w-5 text-[#6b7280] mx-auto mb-1" />
            )}
            <span className="text-xs font-bold text-[#e4e4e4] block uppercase">
              {isUploading ? 'Uploading Archive File...' : 'Select Backup File (.dump)'}
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
      <div className="space-y-3 font-mono">
        <div className="flex items-center justify-between pb-2 border-b border-[#1a1a1a]">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
            <h4 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">03 STORED SNAPSHOTS REGISTRY</h4>
          </div>
          <span className="text-xs text-[#6b7280] font-mono tabular-nums">
            {backups && Array.isArray(backups) ? `${backups.length} ARCHIVES AVAILABLE` : '0 ARCHIVES'}
          </span>
        </div>

        {isBackupsLoading ? (
          <div className="space-y-2 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-[#141414] animate-pulse" />
            ))}
          </div>
        ) : backupsError ? (
          <div className="text-center py-6 bg-[#0f0f0f] border border-red-500/30 rounded-sm p-4 text-xs text-red-400">
            Error loading backups index: {backupsError.message}
          </div>
        ) : !Array.isArray(backups) || backups.length === 0 ? (
          <div className="text-center py-12 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-6 flex flex-col justify-center items-center">
            <Database className="h-8 w-8 text-[#404040] mb-2" />
            <h5 className="text-xs font-bold text-[#e4e4e4] uppercase mb-1">No backups index found</h5>
            <p className="text-xs text-[#6b7280] max-w-sm mx-auto">
              No database backup files exist in server volume storage.
            </p>
          </div>
        ) : (
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm overflow-hidden font-mono">
            <div className="overflow-x-auto max-h-[450px]">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-[#1a1a1a] bg-[#0a0a0a] text-[#6b7280] uppercase tracking-wider select-none">
                    <th className="py-2.5 px-4">Backup File</th>
                    <th className="py-2.5 px-4">Date Created</th>
                    <th className="py-2.5 px-4">Size</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a] text-[#e4e4e4]">
                  {backups.map((backup: any) => {
                    const dateStr = new Date(backup.created_at).toLocaleString()
                    
                    return (
                      <tr 
                        key={backup.filename} 
                        className="hover:bg-[#141414] transition-colors"
                      >
                        <td className="py-2.5 px-4 font-bold text-[#e4e4e4]">
                          <div className="flex items-center space-x-2">
                            <Database className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <span className="break-all">{backup.filename}</span>
                          </div>
                        </td>
                        
                        <td className="py-2.5 px-4 text-[#6b7280] tabular-nums">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 text-[#6b7280]" />
                            <span>{dateStr}</span>
                          </div>
                        </td>
                        
                        <td className="py-2.5 px-4">
                          <span className="bg-[#141414] text-blue-400 border border-[#2a2a2a] px-1.5 py-0.2 rounded-sm text-[10px] font-mono tabular-nums">
                            {backup.size_kb >= 1024 
                              ? `${(backup.size_kb / 1024).toFixed(2)} MB` 
                              : `${backup.size_kb.toFixed(1)} KB`}
                          </span>
                        </td>
                        
                        <td className="py-2.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {/* Download Button */}
                          <button
                            onClick={() => handleDownloadBackup(backup.filename)}
                            className="bg-[#141414] hover:bg-[#1f1f1f] text-[#6b7280] hover:text-[#e4e4e4] border border-[#2a2a2a] p-1 rounded-sm transition cursor-pointer"
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
                            className="bg-[#141414] hover:bg-[#1f1f1f] border border-emerald-500/40 text-emerald-400 px-2.5 py-1 rounded-sm text-[10px] font-mono uppercase transition cursor-pointer"
                            title="Restore database to this state"
                          >
                            Restore
                          </button>
                          
                          {/* Delete Button */}
                          <button
                            onClick={() => setBackupToDelete(backup.filename)}
                            disabled={deleteBackupMutation.isPending}
                            className="bg-[#141414] hover:bg-[#1f1f1f] text-[#6b7280] hover:text-red-400 border border-[#2a2a2a] p-1 rounded-sm transition disabled:opacity-40 cursor-pointer"
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
        open={!!backupToDelete}
        title="Delete Backup File"
        message={`Are you sure you want to permanently delete backup "${backupToDelete}" from the server disk? This action is irreversible.`}
        confirmLabel="Delete Backup"
        danger={true}
        onConfirm={() => {
          if (backupToDelete) {
            deleteBackupMutation.mutate(backupToDelete)
            setBackupToDelete(null)
          }
        }}
        onCancel={() => setBackupToDelete(null)}
      />

      <ConfirmDialog
        open={showRestoreConfirmModal && !!selectedBackup}
        title="Confirm Database Overwrite"
        message="CRITICAL WARNING: Restoring the database will completely overwrite all current files, die status calibrations, machine set configurations, and user accounts."
        confirmLabel="Execute Restore"
        danger={true}
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
