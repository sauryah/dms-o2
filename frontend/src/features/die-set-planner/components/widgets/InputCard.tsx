import React from 'react'
import * as XLSX from 'xlsx'
import { Layers, FileSpreadsheet, Package, Upload } from 'lucide-react'

interface InputCardProps {
  id: string
  title: string
  description: string
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder: string
  badge?: string
  icon: 'inventory' | 'series'
}

export function InputCard({
  id,
  title,
  description,
  value,
  onChange,
  onKeyDown,
  placeholder,
  badge,
  icon,
}: InputCardProps) {
  const Icon = icon === 'inventory' ? Layers : icon === 'series' ? FileSpreadsheet : Package

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        if (!bstr) return
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

        const rows: string[] = []
        for (let rIdx = 0; rIdx < data.length; rIdx++) {
          const row = data[rIdx]
          if (!Array.isArray(row) || row.length === 0) continue

          const sizeVal = row[0]
          const qtyVal = row[1]

          if (sizeVal === undefined || sizeVal === null) continue

          const sizeStr = String(sizeVal).trim()
          if (!sizeStr) continue

          // Skip headers
          if (
            sizeStr.toLowerCase().includes('size') ||
            sizeStr.toLowerCase().includes('die') ||
            sizeStr.toLowerCase().includes('name') ||
            sizeStr.toLowerCase().includes('dimension')
          ) {
            continue
          }

          let qty = 1
          if (qtyVal !== undefined && qtyVal !== null) {
            const parsedQty = parseInt(String(qtyVal))
            if (!isNaN(parsedQty) && parsedQty >= 0) {
              qty = parsedQty
            }
          }

          rows.push(`${sizeStr}\t${qty}`)
        }

        if (rows.length === 0) {
          alert('No valid data rows found in spreadsheet. Column A should contain sizes (e.g. 0.620) and Column B should contain quantities.')
          return
        }

        onChange(rows.join('\n'))
      } catch (err: any) {
        alert(`Failed to parse file: ${err.message || err}`)
      }
    }
    reader.readAsBinaryString(file)
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <label htmlFor={id} className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading cursor-pointer">
            {title}
          </label>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] text-[var(--color-text)] rounded-lg cursor-pointer transition-colors border border-[var(--color-border)]">
            <Upload className="h-3 w-3 text-blue-400" />
            <span>Upload File</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
          {badge && (
            <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-300">
              {badge}
            </span>
          )}
        </div>
      </div>

      <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">{description}</p>

      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        spellCheck={false}
        className="w-full h-44 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text)] font-mono text-xs leading-relaxed focus:border-blue-500 focus:outline-none transition-colors resize-y placeholder:text-[var(--color-muted)]"
      />
    </div>
  )
}
