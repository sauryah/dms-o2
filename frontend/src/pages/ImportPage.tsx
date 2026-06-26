import React, { useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { useApi } from '../App'

export function ImportPage() {
  const { request } = useApi()
  const [file, setFile] = useState<File | null>(null)
  const [statusMsg, setStatusMsg] = useState<{
    type: 'success' | 'error'
    text: string
    errors?: any[]
  } | null>(null)
  const [progress, setProgress] = useState(false)

  const downloadTemplate = () => {
    const csvContent = 
      "die_id,die_type,casing,status,location,remarks,current_set_id,set_name,machine_name,original_size,current_size,original_width,current_width,original_thickness,current_thickness,radius\n" +
      "R-101,ROUND,25x10,AVAILABLE,Rack A - Shelf 3,Sample Round Die,,Set A,Machine 1,2.5,2.5,,,,,\n" +
      "F-201,FLAT,30x15,AVAILABLE,Rack B - Shelf 1,Sample Flat Die,,Set B,Machine 2,,,,30.0,30.0,15.0,15.0,1.5\n"

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "dms_die_import_template.csv")
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
    setStatusMsg(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setProgress(true)
    setStatusMsg(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await request('/api/import/', {
        method: 'POST',
        body: formData
      })
      setStatusMsg({
        type: 'success',
        text: `Import complete: ${res.created} created, ${res.updated} updated, ${res.skipped} skipped.`,
        errors: res.errors || []
      })
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Import failed.'
      })
    } finally {
      setProgress(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Bulk Import Dies</h1>
          <p className="text-slate-400 mt-1">Upload a CSV or XLSX spreadsheet containing die data.</p>
        </div>
        <div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-md"
          >
            <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-500" />
            <span>Download Template (CSV)</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-2xl p-10 text-center transition-all duration-300 bg-slate-950/40 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
            <input 
              type="file" 
              accept=".csv,.xlsx" 
              onChange={handleFileChange}
              id="file-upload"
              className="sr-only"
            />
            <label htmlFor="file-upload" className="cursor-pointer block outline-none">
              <div className="flex flex-col items-center">
                <FileSpreadsheet className="h-12 w-12 text-slate-500 mb-4" />
                <span className="text-slate-350 font-semibold mb-1">
                  {file ? file.name : 'Click to select spreadsheet'}
                </span>
                <span className="text-slate-500 text-xs">Supports CSV and XLSX formats</span>
              </div>
            </label>
          </div>

          <div className="flex justify-end">
            <button 
              type="submit"
              disabled={!file || progress}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-850 text-white disabled:text-slate-500 px-8 py-3.5 rounded-xl font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300 flex items-center justify-center space-x-2 focus-ring"
            >
              {progress ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Uploading & Processing...</span>
                </>
              ) : (
                <span>Upload File</span>
              )}
            </button>
          </div>
        </form>

        {statusMsg && (
          <div className={`mt-8 p-6 rounded-xl border ${
            statusMsg.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}>
            <p className="font-semibold text-md">{statusMsg.text}</p>
            {statusMsg.errors && statusMsg.errors.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800/80">
                <p className="text-slate-400 font-semibold text-sm mb-2">Row Errors:</p>
                <ul className="text-xs font-mono max-h-48 overflow-y-auto space-y-1.5 list-disc list-inside">
                  {statusMsg.errors.map((err, i) => (
                    <li key={i} className="text-rose-400">
                      Row {err.row}: {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
