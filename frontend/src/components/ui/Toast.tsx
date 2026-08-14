import React, { useEffect, useRef } from 'react'
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react'

export interface ToastProps {
  message: string
  variant?: 'success' | 'error' | 'info'
  onDismiss: () => void
}

export function Toast({ message, variant = 'info', onDismiss }: ToastProps) {
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  useEffect(() => {
    if (variant === 'error') return

    const timer = setTimeout(() => {
      onDismissRef.current()
    }, 4000)

    return () => clearTimeout(timer)
  }, [variant])

  const iconMap = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />,
    error: <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />,
    info: <Info className="h-4 w-4 text-blue-400 shrink-0" />
  }

  const borderBgColor = {
    success: 'bg-[#0f0f0f] border-emerald-500/40',
    error: 'bg-[#0f0f0f] border-red-500/40',
    info: 'bg-[#0f0f0f] border-blue-500/40'
  }

  return (
    <div 
      className={`max-w-sm w-full border rounded-sm p-3 flex items-start gap-2.5 animate-slideInFromRight select-none font-mono ${
        borderBgColor[variant]
      }`}
      role="status"
    >
      {/* Icon */}
      {iconMap[variant]}

      {/* Message content */}
      <div className="flex-1 text-xs text-[#e4e4e4] leading-normal font-mono pt-0.5">
        {message}
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={onDismiss}
        className="text-[#6b7280] hover:text-[#e4e4e4] p-0.5 hover:bg-[#141414] rounded-sm transition shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
