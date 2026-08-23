import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Trash2, Plus, X } from 'lucide-react'
import type { EnamelMachine } from '../../types'

interface ManageMachinesModalProps {
  isOpen: boolean
  onClose: () => void
  machines?: EnamelMachine[]
  onCreateMachine: (name: string, description: string) => Promise<void>
  onDeleteMachine: (id: number) => Promise<void>
}

export function ManageMachinesModal({
  isOpen,
  onClose,
  machines,
  onCreateMachine,
  onDeleteMachine,
}: ManageMachinesModalProps) {
  const [newMachineName, setNewMachineName] = useState('')
  const [newMachineDesc, setNewMachineDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleCreate = async () => {
    if (!newMachineName.trim()) {
      alert('Machine Name is required')
      return
    }
    setSubmitting(true)
    try {
      await onCreateMachine(newMachineName.trim(), newMachineDesc.trim())
      setNewMachineName('')
      setNewMachineDesc('')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (
      !confirm(
        'Are you sure you want to delete this enamel machine? All associated stock levels and recounts will also be deleted.',
      )
    ) {
      return
    }
    await onDeleteMachine(id)
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
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden font-mono"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <Settings className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                  Manage Enamel Machines
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Form to Add */}
              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
                <div className="text-[10px] uppercase font-mono font-bold text-[var(--color-muted)] tracking-wider">
                  Add New Enamel Machine
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Machine Name (e.g. Enamel Line 1)"
                    value={newMachineName}
                    onChange={(e) => setNewMachineName(e.target.value)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Description (Optional)"
                    value={newMachineDesc}
                    onChange={(e) => setNewMachineDesc(e.target.value)}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={submitting || !newMachineName.trim()}
                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{submitting ? 'Adding...' : 'Add Machine'}</span>
                </button>
              </div>

              {/* Machines List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                <div className="text-[10px] uppercase font-mono font-bold text-[var(--color-muted)] tracking-wider mb-1">
                  Configured Enamel Machines ({machines?.length || 0})
                </div>
                {machines && machines.length > 0 ? (
                  machines.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs"
                    >
                      <div>
                        <div className="font-bold text-[var(--color-text)]">{m.name}</div>
                        {m.description && (
                          <div className="text-[10px] text-[var(--color-muted)] mt-0.5">{m.description}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Delete Machine"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-[var(--color-muted)] text-xs font-sans">
                    No enamel machines defined yet.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
