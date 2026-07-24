import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  // Listen for Escape key to close the drawer
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none">
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-200 animate-fadeIn" 
      />

      {/* Drawer Panel */}
      <div 
        className="relative w-full max-w-[480px] h-full bg-[var(--color-bg)] border-l border-[var(--color-border)] shadow-2xl flex flex-col z-10 transition-transform duration-200 ease-out transform translate-x-0"
        role="dialog"
        aria-modal="true"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-[var(--color-border)] flex items-center justify-between bg-slate-950/40">
          <h2 className="text-base font-bold text-white tracking-tight font-sans uppercase">
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
