import React, { useRef, useId } from 'react'
import { X } from 'lucide-react'
import { useFocusTrap } from '../../hooks/useFocusTrap'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useFocusTrap(dialogRef, {
    enabled: open,
    onEscape: onClose,
    returnFocus: true,
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#0a0a0a]/80 transition-opacity duration-150 animate-fadeIn"
      />

      {/* Drawer Panel */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-[480px] h-full bg-[#0f0f0f] border-l border-[#2a2a2a] flex flex-col z-10 transition-transform duration-150 ease-out transform translate-x-0 font-mono outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        {/* Drawer Header */}
        <div className="p-3.5 border-b border-[#2a2a2a] flex items-center justify-between bg-[#0a0a0a]">
          <h2 id={titleId} className="text-xs font-medium text-[#e4e4e4] tracking-[0.05em] uppercase font-mono">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#6b7280] hover:text-[#e4e4e4] p-1 hover:bg-[#141414] rounded-sm transition focus-ring"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {children}
        </div>
      </div>
    </div>
  )
}
