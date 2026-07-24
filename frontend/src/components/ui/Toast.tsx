import React, { useEffect } from 'react'
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react'

export interface ToastProps {
  message: string
  variant?: 'success' | 'error' | 'info'
  onDismiss: () => void
}

export function Toast({ message, variant = 'info', onDismiss }: ToastProps) {
  // Auto-dismiss logic
  useEffect(() => {
    if (variant === 'error') return

    const timer = setTimeout(() => {
      onDismiss()
    }, 4000)

    return () => clearTimeout(timer)
  }, [variant, onDismiss])

  const iconMap = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-450 shrink-0" />,
    error: <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />,
    info: <Info className="h-5 w-5 text-blue-400 shrink-0" />
  }

  const borderBgColor = {
    success: 'bg-[var(--color-surface)] border-emerald-500/25 shadow-emerald-500/[0.02]',
    error: 'bg-[var(--color-surface)] border-rose-500/25 shadow-rose-500/[0.02]',
    info: 'bg-[var(--color-surface)] border-blue-500/25 shadow-blue-500/[0.02]'
  }

  return (
    <div 
      className={`max-w-sm w-full border rounded-2xl p-4 flex items-start gap-3 shadow-xl transition-all duration-300 transform translate-x-0 slide-in-from-right select-none ${
        borderBgColor[variant]
      }`}
      role="status"
    >
      {/* Icon */}
      {iconMap[variant]}

      {/* Message content */}
      <div className="flex-1 text-xs text-[var(--color-text)] font-semibold leading-relaxed font-sans pt-0.5">
        {message}
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={onDismiss}
        className="text-[var(--color-muted)] hover:text-white p-1 hover:bg-slate-900 rounded-lg transition shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
