import React, { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'

export interface ConfirmDialogProps {
  open?: boolean
  isOpen?: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  confirmText?: string
  cancelLabel?: string
  cancelText?: string
  requireMatchText?: string
  danger?: boolean
  isDestructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  isOpen,
  title,
  message,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  requireMatchText,
  danger,
  isDestructive,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const visible = open !== undefined ? open : (isOpen !== undefined ? isOpen : false)
  const cText = confirmLabel || confirmText || 'Confirm'
  const canText = cancelLabel || cancelText || 'Cancel'
  const isDanger = danger !== undefined ? danger : (isDestructive !== undefined ? isDestructive : false)

  const [matchInput, setMatchInput] = React.useState('')
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (visible) {
      setMatchInput('')
      const cancelButton = modalRef.current?.querySelector('[data-cancel-btn]') as HTMLElement
      cancelButton?.focus()
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [visible])

  // Trap focus & Escape
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

  if (!visible) return null

  const isConfirmedDisabled = requireMatchText ? matchInput !== requireMatchText : false

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 transition-all duration-150 animate-fadeIn"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--color-surface)] border border-[var(--color-border-visible)] rounded-sm max-w-md w-full overflow-hidden focus-ring font-mono shadow-2xl"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="p-3.5 border-b border-[var(--color-border-visible)] bg-[var(--color-bg)] flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <AlertTriangle className={`h-4 w-4 ${isDanger ? 'text-red-500' : 'text-amber-500'}`} />
            <h2 id="confirm-dialog-title" className="text-xs font-medium text-[var(--color-text)] uppercase tracking-[0.05em] font-mono">
              {title}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-[var(--color-muted)] hover:text-[var(--color-text)] p-1 rounded-sm hover:bg-[var(--color-surface-2)] transition focus-ring cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div className="text-xs text-[var(--color-muted)] font-mono leading-relaxed">
            {message}
          </div>

          {requireMatchText && (
            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-medium text-[var(--color-muted)] uppercase tracking-wider font-mono">
                Type <span className="text-red-400 font-bold">{requireMatchText}</span> to confirm:
              </label>
              <input
                type="text"
                value={matchInput}
                onChange={(e) => setMatchInput(e.target.value)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border-visible)] focus:border-red-500 rounded-sm py-1.5 px-2.5 text-xs text-[var(--color-text)] focus:outline-none placeholder-[var(--color-muted-dark)] transition font-mono"
                placeholder={`Type ${requireMatchText}`}
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="border-t border-[var(--color-border)] pt-3 mt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onCancel}
              data-cancel-btn
              className="bg-[var(--color-surface-2)] hover:bg-[var(--color-border-visible)] text-[var(--color-muted)] hover:text-[var(--color-text)] border border-[var(--color-border-visible)] px-3.5 py-1.5 rounded-sm text-xs uppercase font-mono tracking-wider transition focus-ring cursor-pointer"
            >
              {canText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isConfirmedDisabled}
              className={`px-4 py-1.5 rounded-sm text-xs uppercase font-mono tracking-wider transition focus-ring border cursor-pointer ${
                isDanger
                  ? 'bg-[var(--color-surface-2)] hover:bg-red-950/40 text-red-400 border-red-500/50 disabled:opacity-40'
                  : 'bg-[var(--color-surface-2)] hover:bg-blue-950/40 text-blue-400 border-blue-500/50 disabled:opacity-40'
              }`}
            >
              {cText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
