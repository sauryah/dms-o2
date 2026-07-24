import React from 'react'

export interface EmptyStateProps {
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 select-none">
      {/* Muted message text */}
      <p className="text-xs sm:text-sm font-semibold text-[var(--color-muted)] font-sans max-w-sm leading-relaxed">
        {message}
      </p>

      {/* Action button if provided */}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition focus-ring cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
