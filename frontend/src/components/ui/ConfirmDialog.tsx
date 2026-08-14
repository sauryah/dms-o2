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
  const cancelBtnRef = useRef<HTMLButtonElement>(null)
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

        const isActiveInside = Array.from(focusables).includes(document.activeElement as HTMLElement)
        if (!isActiveInside) {
          firstEl.focus()
          e.preventDefault()
          return
        }

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
    
    // Autofocus: cancel button for danger dialogs, confirm for safe dialogs
    const focusTimer = setTimeout(() => {
      if (danger) {
        cancelBtnRef.current?.focus()
      } else {
        confirmBtnRef.current?.focus()
      }
    }, 50)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(focusTimer)
    }
  }, [open, onCancel, danger])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div 
        onClick={onCancel}
        className="fixed inset-0 bg-[#0a0a0a]/80 transition-opacity duration-150 animate-fadeIn" 
      />

      {/* Centered Dialog Box */}
      <div 
        ref={dialogRef}
        className="relative bg-[#0f0f0f] border border-[#2a2a2a] max-w-md w-full rounded-sm p-4 z-10 animate-fadeIn font-mono"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <div className="flex items-start space-x-3">
          <div className={`p-1.5 rounded-sm shrink-0 border ${danger ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}`}>
            {danger ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
          </div>
          <div className="space-y-1 flex-1">
            <h3 id="confirm-title" className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em] font-mono">
              {title}
            </h3>
            <p id="confirm-message" className="text-xs text-[#6b7280] leading-relaxed font-mono">
              {message}
            </p>
          </div>
        </div>

        {/* Buttons footer */}
        <div className="mt-4 pt-3 border-t border-[#1a1a1a] flex justify-end space-x-2">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            className="bg-[#141414] hover:bg-[#1f1f1f] text-[#6b7280] hover:text-[#e4e4e4] border border-[#2a2a2a] px-3.5 py-1.5 rounded-sm text-xs uppercase font-mono tracking-wider transition focus-ring"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className={`px-4 py-1.5 rounded-sm text-xs uppercase font-mono tracking-wider transition focus-ring border ${
              danger
                ? 'bg-[#141414] hover:bg-red-950/40 text-red-400 border-red-500/50'
                : 'bg-[#141414] hover:bg-blue-950/40 text-blue-400 border-blue-500/50'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
