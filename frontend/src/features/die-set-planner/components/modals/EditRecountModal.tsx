import React, { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileSpreadsheet,
  Download,
  Trash2,
  Database,
  Sparkles,
  Plus,
  X,
  Upload,
  Layers,
  Edit3
} from 'lucide-react'
import { normalizeDieSize, formatDieSize, parseInventoryInput } from '../../domain/parsers'
import type { EnamelMachine } from '../../types'

interface EditRecountModalProps {
  isOpen: boolean
  onClose: () => void
  recountId?: number
  machines?: EnamelMachine[]
  initialName?: string
  initialMachineId?: number
  initialDate?: string
  initialItems?: { die_size: string; quantity: number }[]
  onSave: (payload: {
    name: string
    enamel_machine: number
    recount_date: string
    items: { die_size: string; quantity: number }[]
  }) => Promise<void>
  isSaving: boolean
  onLoadBaseline?: (machineId: number) => Promise<{ die_size: string; quantity: number }[]>
}

export function EditRecountModal({
  isOpen,
  onClose,
  recountId,
  machines,
  initialName = '',
  initialMachineId,
  initialDate = new Date().toISOString().slice(0, 10),
  initialItems = [],
  onSave,
  isSaving,
  onLoadBaseline,
}: EditRecountModalProps) {
  const [recountName, setRecountName] = useState(initialName)
  const [recountMachineId, setRecountMachineId] = useState<number | undefined>(initialMachineId)
  const [recountDate, setRecountDate] = useState(initialDate)
  const [recountItems, setRecountItems] = useState<{ die_size: string; quantity: number }[]>(initialItems)

  const [inputMode, setInputMode] = useState<'single' | 'bulk' | 'excel'>('single')
  const [newSize, setNewSize] = useState('')
  const [newQty, setNewQty] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [hasDraft, setHasDraft] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // Initialize or reset form when modal opens or initial values change
  useEffect(() => {
    if (isOpen) {
      setRecountName(
        initialName ||
          `Audit - ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
      )
      setRecountMachineId(initialMachineId || (machines && machines.length > 0 ? machines[0].id : undefined))
      setRecountDate(initialDate || new Date().toISOString().slice(0, 10))
      setRecountItems(initialItems || [])
      setInputMode('single')
      setNewSize('')
      setNewQty('')
      setBulkText('')
    }
  }, [isOpen, initialName, initialMachineId, initialDate, initialItems, machines])

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Local draft autosave
  useEffect(() => {
    if (isOpen && recountId === undefined && recountMachineId) {
      const draft = {
        name: recountName,
        date: recountDate,
        items: recountItems,
      }
      localStorage.setItem(`dms_draft_recount_${recountMachineId}`, JSON.stringify(draft))
    }
  }, [recountName, recountDate, recountItems, recountMachineId, isOpen, recountId])

  // Check draft existence
  useEffect(() => {
    if (isOpen && recountId === undefined && recountMachineId) {
      const draftStr = localStorage.getItem(`dms_draft_recount_${recountMachineId}`)
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr)
          if (draft && draft.items && draft.items.length > 0) {
            setHasDraft(true)
            return
          }
        } catch {
          // ignore
        }
      }
    }
    setHasDraft(false)
  }, [recountMachineId, isOpen, recountId])

  const handleRestoreDraft = () => {
    if (!recountMachineId) return
    const draftStr = localStorage.getItem(`dms_draft_recount_${recountMachineId}`)
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr)
        setRecountName(draft.name)
        setRecountDate(draft.date)
        setRecountItems(draft.items || [])
        setHasDraft(false)
      } catch {
        // ignore
      }
    }
  }

  const handleBaselinePrefill = async () => {
    if (!recountMachineId || !onLoadBaseline) return
    try {
      const items = await onLoadBaseline(recountMachineId)
      if (items && items.length > 0) {
        setRecountItems(items)
      } else {
        alert('No baseline stock records found for this machine.')
      }
    } catch (err: any) {
      alert(`Failed to load baseline stock: ${err.message || err}`)
    }
  }

  const handleAddItem = () => {
    if (!newSize || !newQty) return
    const { hundredThousands } = normalizeDieSize(newSize)
    if (hundredThousands === null) {
      alert('Invalid die size input format.')
      return
    }
    const cleanSize = formatDieSize(hundredThousands)
    const quantity = parseInt(newQty)
    if (isNaN(quantity) || quantity < 0) {
      alert('Invalid quantity. Must be a positive whole number.')
      return
    }

    const existingIndex = recountItems.findIndex((i) => i.die_size === cleanSize)
    if (existingIndex > -1) {
      const updated = [...recountItems]
      updated[existingIndex].quantity = quantity
      setRecountItems(updated)
    } else {
      setRecountItems([...recountItems, { die_size: cleanSize, quantity }])
    }

    setNewSize('')
    setNewQty('')
  }

  const handleRemoveItem = (index: number) => {
    const updated = [...recountItems]
    updated.splice(index, 1)
    setRecountItems(updated)
  }

  const handleImportBulk = (merge: boolean) => {
    if (!bulkText.trim()) return
    const parsed = parseInventoryInput(bulkText)
    const newItems = parsed.rows.map((row) => ({
      die_size: row.dieSize,
      quantity: row.quantity,
    }))

    if (parsed.errors.length > 0) {
      alert(`Parsed with warnings:\n${parsed.errors.join('\n')}`)
    }

    if (merge) {
      const merged = [...recountItems]
      newItems.forEach((newItem) => {
        const idx = merged.findIndex((i) => i.die_size === newItem.die_size)
        if (idx > -1) {
          merged[idx].quantity = newItem.quantity
        } else {
          merged.push(newItem)
        }
      })
      setRecountItems(merged)
    } else {
      setRecountItems(newItems)
    }

    setBulkText('')
    setInputMode('single')
  }

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
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

        const parsedRows: Array<{ die_size: string; quantity: number }> = []
        const warningMsgs: string[] = []

        for (let rIdx = 0; rIdx < data.length; rIdx++) {
          const row = data[rIdx]
          if (!Array.isArray(row) || row.length === 0) continue

          const sizeVal = row[0]
          const qtyVal = row[1]
          if (sizeVal === undefined || sizeVal === null) continue

          const sizeStr = String(sizeVal).trim()
          if (!sizeStr) continue

          if (
            sizeStr.toLowerCase().includes('size') ||
            sizeStr.toLowerCase().includes('die') ||
            sizeStr.toLowerCase().includes('name') ||
            sizeStr.toLowerCase().includes('dimension')
          ) {
            continue
          }

          const { hundredThousands } = normalizeDieSize(sizeStr)
          if (hundredThousands === null) {
            if (isNaN(Number(sizeStr.replace(/[^\d.-]/g, '')))) continue
            warningMsgs.push(`Row ${rIdx + 1}: Invalid size format "${sizeStr}"`)
            continue
          }

          let qty = 0
          if (qtyVal !== undefined && qtyVal !== null) {
            qty = parseInt(String(qtyVal))
            if (isNaN(qty) || qty < 0) qty = 0
          }

          const cleanSize = formatDieSize(hundredThousands)
          const existing = parsedRows.find((item) => item.die_size === cleanSize)
          if (existing) {
            existing.quantity += qty
          } else {
            parsedRows.push({ die_size: cleanSize, quantity: qty })
          }
        }

        if (parsedRows.length === 0) {
          alert('No valid die size & quantity rows found in spreadsheet.')
          return
        }

        if (warningMsgs.length > 0) {
          alert(`Imported with warnings:\n${warningMsgs.slice(0, 5).join('\n')}`)
        }

        setRecountItems(parsedRows)
        setInputMode('single')
      } catch (err: any) {
        alert(`Failed to parse Excel: ${err.message || err}`)
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleDownloadTemplate = () => {
    const data = [
      ['Die Size (mm or inch)', 'Quantity'],
      ['0.620', 5],
      ['0.625', 3],
      ['16.00', 8],
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = [{ wch: 22 }, { wch: 12 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'die_recount_template.xlsx')
  }

  const handleSave = async () => {
    if (!recountName.trim()) {
      alert('Recount Sheet Name is required')
      return
    }
    if (!recountMachineId) {
      alert('Please select an Enamel Machine')
      return
    }

    await onSave({
      name: recountName.trim(),
      enamel_machine: recountMachineId,
      recount_date: recountDate,
      items: recountItems,
    })

    if (!recountId && recountMachineId) {
      localStorage.removeItem(`dms_draft_recount_${recountMachineId}`)
      setHasDraft(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden font-mono"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <Edit3 className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                  {recountId ? 'Edit Recount Sheet (Draft)' : 'Create Recount Sheet'}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Meta Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-mono font-bold text-[var(--color-muted)] mb-1">
                    Sheet Name
                  </label>
                  <input
                    type="text"
                    value={recountName}
                    onChange={(e) => setRecountName(e.target.value)}
                    placeholder="e.g. August 2026 Count"
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-mono font-bold text-[var(--color-muted)] mb-1">
                    Enamel Machine
                  </label>
                  <select
                    value={recountMachineId || ''}
                    onChange={(e) => setRecountMachineId(Number(e.target.value))}
                    disabled={!!recountId}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] focus:border-blue-500 focus:outline-none disabled:opacity-50"
                  >
                    {machines?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-mono font-bold text-[var(--color-muted)] mb-1">
                    Audit Date
                  </label>
                  <input
                    type="date"
                    value={recountDate}
                    onChange={(e) => setRecountDate(e.target.value)}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text)] font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Prefill & Restore Actions */}
              {!recountId && (
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {onLoadBaseline && (
                    <button
                      type="button"
                      onClick={handleBaselinePrefill}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 transition cursor-pointer"
                    >
                      <Database className="h-3.5 w-3.5" />
                      Prefill with current machine stock
                    </button>
                  )}
                  {hasDraft && (
                    <button
                      type="button"
                      onClick={handleRestoreDraft}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      Restore unsaved draft count
                    </button>
                  )}
                </div>
              )}

              {/* Mode Switcher */}
              <div className="flex bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setInputMode('single')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    inputMode === 'single'
                      ? 'bg-[var(--color-surface)] text-blue-400 shadow-sm border border-blue-500/30'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  Single Size Input
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('bulk')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    inputMode === 'bulk'
                      ? 'bg-[var(--color-surface)] text-blue-400 shadow-sm border border-blue-500/30'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  Bulk Paste (TSV)
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('excel')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    inputMode === 'excel'
                      ? 'bg-[var(--color-surface)] text-blue-400 shadow-sm border border-blue-500/30'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  Excel / CSV File
                </button>
              </div>

              {/* Input Mode: Single */}
              {inputMode === 'single' && (
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3.5 space-y-2">
                  <div className="text-[10px] uppercase font-mono font-bold text-[var(--color-muted)]">
                    Add or Update Die Tally
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Die Size (e.g. 0.620 or 16.00)"
                      value={newSize}
                      onChange={(e) => setNewSize(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
                      className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text)] focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={newQty}
                      onChange={(e) => setNewQty(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
                      min={0}
                      className="w-24 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text)] text-center focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Input Mode: Bulk */}
              {inputMode === 'bulk' && (
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3.5 space-y-3">
                  <div className="text-[10px] uppercase font-mono font-bold text-[var(--color-muted)]">
                    Paste Tab/Space Separated Rows
                  </div>
                  <textarea
                    placeholder="0.620  4&#10;0.625  2"
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    className="w-full h-24 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--color-text)] focus:border-blue-500 focus:outline-none resize-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleImportBulk(true)}
                      disabled={!bulkText.trim()}
                      className="px-3 py-1.5 rounded-lg bg-blue-600/10 border border-blue-500/30 text-blue-300 hover:bg-blue-600/20 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      Merge & Update
                    </button>
                    <button
                      type="button"
                      onClick={() => handleImportBulk(false)}
                      disabled={!bulkText.trim()}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      Overwrite All
                    </button>
                  </div>
                </div>
              )}

              {/* Input Mode: Excel */}
              {inputMode === 'excel' && (
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
                  <div className="border-2 border-dashed border-[var(--color-border)] hover:border-blue-500/50 rounded-xl p-6 text-center cursor-pointer relative">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleExcelImport}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <FileSpreadsheet className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                    <div className="text-xs font-semibold text-[var(--color-text)] mb-1">
                      Click or drag spreadsheet file (.xlsx, .xls, .csv) here
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[var(--color-muted)] px-1">
                    <span>Need a starting template?</span>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Download Excel Template
                    </button>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div className="border border-[var(--color-border)] rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)] font-mono text-[10px] text-[var(--color-muted)] uppercase tracking-wider">
                      <th className="py-2.5 px-4 font-semibold">Die Size (mm)</th>
                      <th className="py-2.5 px-4 text-center font-semibold">Audited Quantity</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]/60 font-mono">
                    {recountItems.map((item, idx) => (
                      <tr key={item.die_size} className="hover:bg-[var(--color-surface-2)]">
                        <td className="py-2.5 px-4 font-bold text-[var(--color-text)]">{item.die_size}</td>
                        <td className="py-2.5 px-4 text-center font-bold text-blue-400">{item.quantity}</td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 rounded text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {recountItems.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-[var(--color-muted)] font-sans">
                          No tallies recorded. Add a die size & quantity above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <div className="text-xs text-[var(--color-muted)] font-mono">
                {recountItems.length} unique sizes registered
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !recountName.trim() || !recountMachineId}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
