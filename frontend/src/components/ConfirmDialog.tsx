import React, { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  requireMatchText?: string
  isDestructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  requireMatchText,
  isDestructive = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const [matchInput, setMatchInput] = React.useState('')
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setMatchInput('')
      // Focus on the cancel button first to prevent accidental confirmation
      const cancelButton = modalRef.current?.querySelector('[data-cancel-btn]') as HTMLElement
      cancelButton?.focus()

      // Lock scroll
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Trap focus
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
      return
    }

    if (e.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusableElements) return

      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus()
          e.preventDefault()
        }
      }
    }
  }

  if (!isOpen) return null

  const isConfirmedDisabled = requireMatchText ? matchInput !== requireMatchText : false

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-fadeIn"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden focus-ring"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className={`h-5 w-5 ${isDestructive ? 'text-rose-500' : 'text-amber-500'}`} />
            <h2 id="confirm-dialog-title" className="text-lg font-bold text-white font-heading">
              {title}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition focus-ring"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-300 font-sans leading-relaxed">
            {message}
          </p>

          {requireMatchText && (
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Type <span className="text-rose-500 font-bold">{requireMatchText}</span> to confirm:
              </label>
              <input
                type="text"
                value={matchInput}
                onChange={(e) => setMatchInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none placeholder-slate-700 transition"
                placeholder={`Type ${requireMatchText}`}
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="border-t border-slate-800/80 pt-4 mt-2 flex justify-end space-x-3">
            <button
              onClick={onCancel}
              data-cancel-btn
              className="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 px-4.5 py-2 rounded-xl text-xs font-semibold transition focus-ring"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isConfirmedDisabled}
              className={`px-5 py-2 rounded-xl text-xs font-semibold transition focus-ring shadow-md ${
                isDestructive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white disabled:bg-rose-800/40 disabled:text-rose-400/50 shadow-rose-600/10'
                  : 'bg-blue-600 hover:bg-blue-500 text-white disabled:bg-blue-800/40 disabled:text-blue-400/50 shadow-blue-600/10'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
