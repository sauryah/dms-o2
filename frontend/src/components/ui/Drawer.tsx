import React, { useEffect, useRef, useId } from 'react'
import { X } from 'lucide-react'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return

    // Remember what had focus before opening
    previousFocusRef.current = document.activeElement as HTMLElement

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'Tab') {
        const dialog = dialogRef.current
        if (!dialog) return

        const focusables = dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

    // Auto-focus the close button (first focusable in header)
    const focusTimer = setTimeout(() => {
      const closeBtn = dialogRef.current?.querySelector<HTMLElement>('button[aria-label="Close panel"]')
      closeBtn?.focus()
    }, 50)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(focusTimer)
      // Restore focus to the element that was focused before opening
      previousFocusRef.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-200 animate-fadeIn"
      />

      {/* Drawer Panel */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-[480px] h-full bg-[var(--color-bg)] border-l border-[var(--color-border)] shadow-2xl flex flex-col z-10 transition-transform duration-200 ease-out transform translate-x-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between bg-slate-950/40">
          <h2 id={titleId} className="text-base font-bold text-white tracking-tight font-sans uppercase">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-muted)] hover:text-white p-2 hover:bg-slate-900 rounded-xl transition focus-ring"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {children}
        </div>
      </div>
    </div>
  )
}
