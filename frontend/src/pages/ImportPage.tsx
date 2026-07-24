import React, { useState, useEffect } from 'react'
import { FileSpreadsheet, ArrowLeft, Download, UploadCloud, CheckCircle, AlertTriangle, AlertCircle, FileText } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
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
    if (importStatus?.status === 'importing') {
      const interval = setInterval(() => checkStatus(false), 1000)
      return () => clearInterval(interval)
    }
  }, [importStatus?.status])

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
    { key: 'row', label: 'Row #', render: (row: any) => <span className="font-mono text-slate-400 font-bold">{row.row}</span> },
    { key: 'die_id', label: 'Die ID', render: (row: any) => <span className="font-mono text-blue-450 font-semibold">{row.die_id ?? 'N/A'}</span> },
    { key: 'field', label: 'Field', render: (row: any) => <span className="font-bold text-slate-300">{row.field ?? 'General'}</span> },
    { key: 'error', label: 'Error Message', render: (row: any) => <span className="text-rose-400 whitespace-normal font-mono text-[11px] block max-w-md">{row.error}</span> }
  ]

  const headerActions = (
    <button
      type="button"
      onClick={downloadTemplate}
      className="flex items-center space-x-2 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300"
    >
      <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
      <span>Download template (Excel)</span>
    </button>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Back Link */}
      <div className="flex items-center justify-between print:hidden">
        <button 
          onClick={() => navigate('/inventory')}
          className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-950 border border-slate-800 hover:border-slate-700 px-4 py-2.5 rounded-xl transition-all duration-300 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-blue-500" />
          <span>Back to Inventory</span>
        </button>
      </div>

      <PageHeader 
        title="Bulk Import Dies" 
        breadcrumbs={breadcrumbs}
        actions={headerActions}
      />

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 bg-slate-950/40 focus-within:ring-2 focus-within:ring-blue-500 ${
              isDragging 
                ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                : 'border-slate-800 hover:border-slate-700'
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
                <div className={`p-4 rounded-full border mb-4 transition-all duration-300 ${
                  file ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}>
                  {file ? <FileSpreadsheet className="h-8 w-8" /> : <UploadCloud className="h-8 w-8" />}
                </div>
                <span className="text-slate-200 font-bold mb-1 text-sm">
                  {file ? file.name : 'Click or drag spreadsheet file here'}
                </span>
                <span className="text-slate-500 text-xs mt-0.5">Supports CSV and XLSX spreadsheets</span>
              </div>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <button 
              type="button"
              disabled={!file || progress}
              onClick={(e) => handleSubmit(e, true)}
              className="w-full sm:w-auto bg-slate-950 hover:bg-slate-900 disabled:opacity-40 border border-slate-800 text-slate-300 hover:text-white px-6 py-3 rounded-xl font-bold text-xs transition cursor-pointer"
            >
              Preview (Dry Run)
            </button>
            <button 
              type="submit"
              disabled={!file || progress}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:from-slate-800 disabled:to-slate-850 text-white px-8 py-3 rounded-xl font-bold text-xs shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition cursor-pointer"
            >
              {progress ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Processing...</span>
                </div>
              ) : (
                <span>Import Data</span>
              )}
            </button>
          </div>
        </form>

        {importStatus && importStatus.status === 'importing' && (
          <div className="mt-8 p-6 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center text-xs font-bold text-slate-400">
              <span className="truncate max-w-xs sm:max-w-sm">Importing: {importStatus.filename}</span>
              <span className="font-mono text-blue-400">
                {importStatus.total > 0 ? `${Math.round((importStatus.progress / importStatus.total) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800/80">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${importStatus.total > 0 ? (importStatus.progress / importStatus.total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span>Processed {importStatus.progress} of {importStatus.total} rows</span>
              <span className="animate-pulse text-blue-500">Running in background...</span>
            </div>
          </div>
        )}

        {statusMsg && (
          <div className={`mt-8 p-5 rounded-2xl border flex items-start gap-3 animate-fadeIn ${
            statusMsg.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-450'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
            <p className="font-bold text-sm leading-relaxed">{statusMsg.text}</p>
          </div>
        )}

        {importResult && (
          <div className="mt-8 space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 border border-slate-800 p-5 rounded-2xl">
              <div className="flex flex-wrap items-center gap-6">
                <span className="text-xs font-bold text-slate-400">
                  <span className="text-emerald-500 font-extrabold mr-1 text-sm">✓</span> {importResult.created} created
                </span>
                <span className="text-xs font-bold text-slate-400">
                  <span className="text-blue-550 font-extrabold mr-1 text-sm">✓</span> {importResult.updated} updated
                </span>
                <span className="text-xs font-bold text-slate-400">
                  <span className="text-slate-500 font-extrabold mr-1 text-sm">✓</span> {importResult.skipped} skipped
                </span>
                <span className="text-xs font-bold text-slate-400">
                  <span className="text-rose-500 font-extrabold mr-1 text-sm">✗</span> {importResult.errors.length} errors
                </span>
              </div>
              
              {importResult.errors.length > 0 && (
                <button
                  type="button"
                  onClick={downloadErrorReport}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-800 hover:border-slate-700"
                >
                  Download Error Report (CSV)
                </button>
              )}
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-950/20">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Import Row Errors</h3>
                </div>
                <DataTable columns={errorColumns} rows={importResult.errors} />
              </div>
            )}
          </div>
        )}
      </div>

      {showPreviewModal && dryRunResult && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 relative overflow-hidden shadow-2xl space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-bold text-white font-heading">Import Preview (Dry Run)</h2>
              <p className="text-slate-400 text-xs mt-1">Review the results of the simulated import before writing to database.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl text-center">
                <span className="text-xxs text-slate-500 font-bold uppercase tracking-wider block">To Create</span>
                <span className="text-xl font-mono font-bold text-emerald-400 mt-1 block">{dryRunResult.created}</span>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl text-center">
                <span className="text-xxs text-slate-500 font-bold uppercase tracking-wider block">To Update</span>
                <span className="text-xl font-mono font-bold text-blue-400 mt-1 block">{dryRunResult.updated}</span>
              </div>
              <div className="bg-slate-955/40 border border-slate-800/80 p-4 rounded-xl text-center">
                <span className="text-xxs text-slate-505 font-bold uppercase tracking-wider block">To Skip</span>
                <span className="text-xl font-mono font-bold text-slate-400 mt-1 block">{dryRunResult.skipped}</span>
              </div>
              <div className="bg-slate-955/40 border border-slate-800/80 p-4 rounded-xl text-center">
                <span className="text-xxs text-slate-500 font-bold uppercase tracking-wider block">Errors</span>
                <span className={`text-xl font-mono font-bold mt-1 block ${dryRunResult.errors.length > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>
                  {dryRunResult.errors.length}
                </span>
              </div>
            </div>

            {dryRunResult.errors.length > 0 && (
              <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-xl">
                <span className="text-xs text-rose-300 font-bold block mb-2">Simulated Errors:</span>
                <ul className="text-xs font-mono max-h-40 overflow-y-auto space-y-1.5 list-disc list-inside text-rose-455">
                  {dryRunResult.errors.map((err, i) => (
                    <li key={i}>
                      Row {err.row}: {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setShowPreviewModal(false)
                  setDryRunResult(null)
                }}
                className="px-6 py-2.5 bg-slate-955 hover:bg-slate-900 border border-slate-800 text-slate-350 hover:text-white rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={progress}
                onClick={(e) => handleSubmit(e, false)}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition cursor-pointer"
              >
                Confirm Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
