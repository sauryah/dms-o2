import { useState, useEffect, useCallback } from 'react'
import { FileSpreadsheet, ArrowLeft, UploadCloud, CheckCircle, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import { PageHeader } from '../components/ui/PageHeader'
import { DataTable } from '../components/ui/DataTable'

export function ImportPage() {
  const navigate = useNavigate()
  const { request } = useApi()
  const { token } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const [importStatus, setImportStatus] = useState<{
    status: 'idle' | 'importing' | 'ready' | 'error'
    progress: number
    total: number
    filename: string
    dry_run: boolean
    message?: string
    result?: any
  } | null>(null)

  const progress = importStatus?.status === 'importing'

  // Import results state
  const [importResult, setImportResult] = useState<{
    created: number
    updated: number
    skipped: number
    errors: any[]
  } | null>(null)

  // Dry-run preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [dryRunResult, setDryRunResult] = useState<{
    created: number
    updated: number
    skipped: number
    errors: any[]
  } | null>(null)

  const checkStatus = async (onMount = false) => {
    try {
      const status = await request('/api/go/import-status')
      if (status.status === 'importing') {
        setImportStatus(status)
      } else if (status.status === 'ready') {
        if (!onMount) {
          const result = status.result
          if (status.dry_run) {
            setDryRunResult({
              created: result.created,
              updated: result.updated,
              skipped: result.skipped,
              errors: result.errors || []
            })
            setShowPreviewModal(true)
          } else {
            setImportResult({
              created: result.created,
              updated: result.updated,
              skipped: result.skipped,
              errors: result.errors || []
            })
            setStatusMsg({
              type: 'success',
              text: `Import complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped.`
            })
          }
        }
        setImportStatus(null)
      } else if (status.status === 'error') {
        if (!onMount) {
          setStatusMsg({
            type: 'error',
            text: status.message || 'Import failed.'
          })
        }
        setImportStatus(null)
      } else {
        setImportStatus(null)
      }
    } catch (err) {
      console.error('Failed to fetch import status', err)
    }
  }

  useEffect(() => {
    checkStatus(true)
  }, [])

  useEffect(() => {
    if (importStatus?.status !== 'importing') return
    const interval = setInterval(() => checkStatus(false), 1000)
    return () => clearInterval(interval)
  }, [importStatus?.status])

  const closeModal = useCallback(() => {
    setShowPreviewModal(false)
    setDryRunResult(null)
  }, [])

  useEffect(() => {
    if (!showPreviewModal) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showPreviewModal, closeModal])

  const downloadTemplate = async () => {
    try {
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const res = await fetch('/api/v1/import/template/', {
        method: 'GET',
        headers
      })
      if (!res.ok) {
        throw new Error('Failed to download template')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", "dms_import_template.xlsx")
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Template download failed.'
      })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
    setStatusMsg(null)
    setImportResult(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!progress) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (progress) return

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      const ext = droppedFile.name.split('.').pop()?.toLowerCase()
      if (ext === 'csv' || ext === 'xlsx') {
        setFile(droppedFile)
        setStatusMsg(null)
        setImportResult(null)
      } else {
        setStatusMsg({
          type: 'error',
          text: 'Unsupported file format. Please drop a .csv or .xlsx file.'
        })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent, dryRun = false) => {
    if (e) e.preventDefault()
    if (!file) return

    setStatusMsg(null)
    setImportResult(null)
    setDryRunResult(null)

    const formData = new FormData()
    formData.append('file', file)

    const url = `/api/import/${dryRun ? '?dry_run=true' : ''}`

    try {
      setImportStatus({
        status: 'importing',
        progress: 0,
        total: 100,
        filename: file.name,
        dry_run: dryRun
      })

      await request(url, {
        method: 'POST',
        body: formData
      })
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Import failed.'
      })
      setImportStatus(null)
    }
  }

  const downloadErrorReport = () => {
    if (!importResult || !importResult.errors || importResult.errors.length === 0) return

    let csvContent = "Row #,Die ID,Field,Error Message\n"
    importResult.errors.forEach(err => {
      const row = err.row ?? ""
      const dieId = err.die_id ?? "N/A"
      const field = err.field ?? "General"
      const errorMsg = `"${(err.error ?? "").replace(/"/g, '""')}"`
      csvContent += `${row},${dieId},${field},${errorMsg}\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `dms_import_error_report_${Date.now()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const breadcrumbs = [
    { label: 'Inventory', href: '/inventory' },
    { label: 'Bulk Import' }
  ]

  const errorColumns = [
    { key: 'row', label: 'Row #', render: (row: any) => <span className="font-mono text-[#e4e4e4] font-bold">{row.row}</span> },
    { key: 'die_id', label: 'Die ID', render: (row: any) => <span className="font-mono text-blue-400 font-bold">{row.die_id ?? 'N/A'}</span> },
    { key: 'field', label: 'Field', render: (row: any) => <span className="text-[#6b7280] uppercase">{row.field ?? 'General'}</span> },
    { key: 'error', label: 'Error Message', render: (row: any) => <span className="text-red-400 whitespace-normal font-mono text-xs block max-w-md">{row.error}</span> }
  ]

  const headerActions = (
    <button
      type="button"
      onClick={downloadTemplate}
      className="flex items-center space-x-1.5 bg-[#141414] hover:bg-[#1f1f1f] text-[#6b7280] hover:text-[#e4e4e4] border border-[#2a2a2a] px-3.5 py-1.5 rounded-sm text-xs font-mono uppercase transition cursor-pointer"
    >
      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
      <span>Template (.xlsx)</span>
    </button>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-mono">
      {/* Back Link */}
      <div className="flex items-center justify-between print:hidden">
        <button 
          onClick={() => navigate('/inventory')}
          className="flex items-center space-x-1.5 text-xs uppercase font-mono text-[#6b7280] bg-[#141414] border border-[#2a2a2a] hover:border-[#3a3a3a] px-3 py-1 rounded-sm transition-colors hover:text-[#e4e4e4] cursor-pointer"
        >
          <ArrowLeft className="h-3 w-3 text-blue-500" />
          <span>Back to Inventory</span>
        </button>
      </div>

      <PageHeader 
        title="Bulk Import Dies" 
        breadcrumbs={breadcrumbs}
        actions={headerActions}
      />

      <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-6 space-y-4 font-mono">
        <div className="border-b border-[#1a1a1a] pb-2">
          <h2 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">01 SPREADSHEET FILE INGESTION</h2>
          <p className="text-[#6b7280] text-xs mt-0.5">Upload CSV or Excel file containing batch die master records.</p>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border border-dashed rounded-sm p-8 text-center transition-colors bg-[#0a0a0a] ${
              isDragging 
                ? 'border-blue-500 bg-[#141414]' 
                : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
            }`}
          >
            <input 
              type="file" 
              accept=".csv,.xlsx" 
              onChange={handleFileChange}
              id="file-upload"
              className="sr-only"
              disabled={progress}
            />
            <label htmlFor="file-upload" className="cursor-pointer block outline-none">
              <div className="flex flex-col items-center">
                <div className={`p-3 rounded-sm border mb-3 ${
                  file ? 'bg-[#141414] border-emerald-500/40 text-emerald-400' : 'bg-[#141414] border-[#2a2a2a] text-[#6b7280]'
                }`}>
                  {file ? <FileSpreadsheet className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
                </div>
                <span className="text-[#e4e4e4] text-xs font-mono font-bold uppercase mb-0.5">
                  {file ? file.name : 'Click or drop spreadsheet file here'}
                </span>
                <span className="text-[#6b7280] text-[10px] uppercase">Accepts .CSV and .XLSX datasets</span>
              </div>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1">
            <button 
              type="button"
              disabled={!file || progress}
              onClick={(e) => handleSubmit(e, true)}
              className="w-full sm:w-auto bg-[#141414] hover:bg-[#1f1f1f] disabled:opacity-40 border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] px-4 py-1.5 rounded-sm text-xs font-mono uppercase transition cursor-pointer"
            >
              Preview (Dry Run)
            </button>
            <button 
              type="submit"
              disabled={!file || progress}
              className="w-full sm:w-auto bg-[#141414] hover:bg-[#1f1f1f] disabled:opacity-40 border border-blue-500/50 text-blue-400 hover:text-blue-300 px-5 py-1.5 rounded-sm text-xs font-mono uppercase transition cursor-pointer"
            >
              {progress ? (
                <div className="flex items-center space-x-1.5">
                  <div className="animate-spin h-3.5 w-3.5 border border-white border-t-transparent rounded-none" />
                  <span>Processing Ingestion...</span>
                </div>
              ) : (
                <span>Execute Import</span>
              )}
            </button>
          </div>
        </form>

        {importStatus && importStatus.status === 'importing' && (
          <div className="mt-4 p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm space-y-2 font-mono animate-fadeIn">
            <div className="flex justify-between items-center text-xs text-[#6b7280] uppercase">
              <span className="truncate max-w-xs">INGESTING: {importStatus.filename}</span>
              <span className="font-mono text-blue-400 font-bold tabular-nums">
                {importStatus.total > 0 ? `${Math.round((importStatus.progress / importStatus.total) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="w-full bg-[#141414] h-2 rounded-none overflow-hidden border border-[#2a2a2a]">
              <div 
                className="bg-blue-500 h-2 transition-all duration-150"
                style={{ width: `${importStatus.total > 0 ? (importStatus.progress / importStatus.total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#6b7280] uppercase">
              <span>PROCESSED {importStatus.progress} OF {importStatus.total} ROWS</span>
              <span className="text-blue-400 animate-pulse">TRANSACTION RUNNING...</span>
            </div>
          </div>
        )}

        {statusMsg && (
          <div className={`mt-4 p-3 rounded-sm border flex items-start gap-2.5 font-mono text-xs ${
            statusMsg.type === 'success' 
              ? 'bg-[#141414] border-emerald-500/30 text-emerald-400' 
              : 'bg-[#141414] border-red-500/30 text-red-400'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
            <p className="leading-normal">{statusMsg.text}</p>
          </div>
        )}

        {importResult && (
          <div className="mt-4 space-y-4 font-mono animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="text-emerald-400 font-mono font-bold">
                  ▲ {importResult.created} CREATED
                </span>
                <span className="text-blue-400 font-mono font-bold">
                  ● {importResult.updated} UPDATED
                </span>
                <span className="text-[#6b7280] font-mono">
                  — {importResult.skipped} SKIPPED
                </span>
                <span className="text-red-400 font-mono font-bold">
                  ▼ {importResult.errors.length} ERRORS
                </span>
              </div>
              
              {importResult.errors.length > 0 && (
                <button
                  type="button"
                  onClick={downloadErrorReport}
                  className="px-3 py-1 bg-[#141414] hover:bg-[#1f1f1f] text-[#6b7280] hover:text-[#e4e4e4] rounded-sm text-xs font-mono uppercase transition-colors border border-[#2a2a2a] cursor-pointer"
                >
                  Error Report (.csv)
                </button>
              )}
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm overflow-hidden font-mono">
                <div className="p-3 border-b border-[#1a1a1a] bg-[#0a0a0a]">
                  <h3 className="text-xs font-medium text-red-400 uppercase tracking-wider">02 IMPORT ROW ERRORS</h3>
                </div>
                <DataTable columns={errorColumns} rows={importResult.errors} />
              </div>
            )}
          </div>
        )}
      </div>

      {showPreviewModal && dryRunResult && (
        <div
          className="fixed inset-0 bg-[#0a0a0a]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto font-mono"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dry-run-title"
            className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-sm max-w-xl w-full p-5 relative overflow-hidden shadow-2xl space-y-4 animate-fadeIn font-mono"
          >
            <div className="border-b border-[#1a1a1a] pb-2">
              <h2 id="dry-run-title" className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">01 SIMULATION PREVIEW (DRY RUN)</h2>
              <p className="text-[#6b7280] text-xs mt-0.5">Dry-run validation results prior to database write commit.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm text-center">
                <span className="text-[10px] text-[#6b7280] uppercase block">TO CREATE</span>
                <span className="text-lg font-mono font-bold text-emerald-400 mt-0.5 block tabular-nums">{dryRunResult.created}</span>
              </div>
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm text-center">
                <span className="text-[10px] text-[#6b7280] uppercase block">TO UPDATE</span>
                <span className="text-lg font-mono font-bold text-blue-400 mt-0.5 block tabular-nums">{dryRunResult.updated}</span>
              </div>
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm text-center">
                <span className="text-[10px] text-[#6b7280] uppercase block">TO SKIP</span>
                <span className="text-lg font-mono font-bold text-[#6b7280] mt-0.5 block tabular-nums">{dryRunResult.skipped}</span>
              </div>
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-sm text-center">
                <span className="text-[10px] text-[#6b7280] uppercase block">ERRORS</span>
                <span className={`text-lg font-mono font-bold mt-0.5 block tabular-nums ${dryRunResult.errors.length > 0 ? 'text-red-400' : 'text-[#6b7280]'}`}>
                  {dryRunResult.errors.length}
                </span>
              </div>
            </div>

            {dryRunResult.errors.length > 0 && (
              <div className="bg-[#0a0a0a] border border-red-500/30 p-3 rounded-sm">
                <span className="text-xs text-red-400 font-bold block mb-1 uppercase">Validation Errors:</span>
                <ul className="text-xs font-mono max-h-36 overflow-y-auto space-y-1 list-disc list-inside text-[#e4e4e4]">
                  {dryRunResult.errors.map((err, i) => (
                    <li key={i}>
                      ROW {err.row}: {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-[#1a1a1a]">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-1.5 bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] rounded-sm text-xs font-mono uppercase transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={progress}
                onClick={(e) => handleSubmit(e, false)}
                className="px-5 py-1.5 bg-[#141414] hover:bg-[#1f1f1f] border border-blue-500/50 text-blue-400 hover:text-blue-300 rounded-sm text-xs font-mono uppercase transition cursor-pointer"
              >
                Confirm Ingestion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
