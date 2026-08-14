import React from 'react'

export interface EmptyStateProps {
  title?: string
  description?: string
  message?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ title, description, message, actionLabel, onAction }: EmptyStateProps) {
  const displayTitle = title || message
  return (
    <div className="flex flex-col items-center justify-center text-center p-6 font-mono">
      {/* Muted title / message text */}
      {displayTitle && (
        <h3 className="text-xs font-medium uppercase tracking-wider text-[#6b7280] max-w-sm leading-relaxed font-mono">
          {displayTitle}
        </h3>
      )}
      {description && (
        <p className="mt-1 text-xs text-[#404040] font-mono">
          {description}
        </p>
      )}

      {/* Action button if provided */}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 bg-[#141414] hover:bg-[#1f1f1f] text-[#e4e4e4] border border-[#2a2a2a] px-3.5 py-1.5 rounded-sm text-xs uppercase font-mono tracking-wider transition focus-ring cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
