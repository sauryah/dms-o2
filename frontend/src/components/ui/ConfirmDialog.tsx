import React, { useEffect, useRef } from 'react'
import { AlertCircle, AlertTriangle } from 'lucide-react'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = false
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  // Escape key listener & Focus Trap
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
        return
      }

      if (e.key === 'Tab') {
        if (!dialogRef.current) return
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex="0"]'
        )
        if (focusables.length === 0) return
        
        const firstEl = focusables[0]
        const lastEl = focusables[focusables.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            lastEl.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === lastEl) {
            firstEl.focus()
            e.preventDefault()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    
    // Autofocus confirm button
    const focusTimer = setTimeout(() => {
      confirmBtnRef.current?.focus()
    }, 50)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(focusTimer)
    }
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop overlay */}
      <div 
        onClick={onCancel}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-200 animate-fadeIn" 
      />

      {/* Centered Dialog Box */}
      <div 
        ref={dialogRef}
        className="relative bg-[var(--color-surface)] border border-[var(--color-border)] max-w-md w-full rounded-2xl shadow-2xl p-6 z-10 animate-fadeIn"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <div className="flex items-start space-x-4">
          <div className={`p-2.5 rounded-xl shrink-0 ${danger ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-400'}`}>
            {danger ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 id="confirm-title" className="text-base font-bold text-white font-sans uppercase">
              {title}
            </h3>
            <p id="confirm-message" className="text-xs text-[var(--color-muted)] leading-relaxed font-medium">
              {message}
            </p>
          </div>
        </div>

        {/* Buttons footer */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="bg-slate-950 hover:bg-slate-900 text-slate-350 border border-slate-800 hover:border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold transition focus-ring"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition focus-ring ${
              danger
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-500/10 hover:shadow-red-500/20'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/10 hover:shadow-blue-500/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
