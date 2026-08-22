import React from 'react'
import { FolderOpen } from 'lucide-react'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title?: string
  description?: string
  message?: string
  actionLabel?: string
  onAction?: () => void
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({
  icon = <FolderOpen className="h-8 w-8 text-[#6b7280]" />,
  title,
  description,
  message,
  actionLabel,
  onAction,
  action
}: EmptyStateProps) {
  const displayTitle = title || message
  const btnLabel = action?.label || actionLabel
  const btnAction = action?.onClick || onAction

  return (
    <div className="text-center py-10 px-6 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm flex flex-col justify-center items-center max-w-lg mx-auto animate-fadeIn font-mono">
      {icon && (
        <div className="p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm mb-3 flex items-center justify-center">
          {icon}
        </div>
      )}
      {displayTitle && (
        <h3 className="text-sm font-medium text-[#e4e4e4] uppercase tracking-[0.05em] mb-1 font-mono">
          {displayTitle}
        </h3>
      )}
      {description && (
        <p className="text-[#6b7280] text-xs max-w-sm mb-4 leading-relaxed font-mono">
          {description}
        </p>
      )}
      {btnLabel && btnAction && (
        <button
          type="button"
          onClick={btnAction}
          className="bg-[#141414] hover:bg-[#1f1f1f] border border-blue-500/60 text-blue-400 hover:text-blue-300 px-4 py-1.5 rounded-sm text-xs uppercase font-mono tracking-wider transition focus-ring cursor-pointer"
        >
          {btnLabel}
        </button>
      )}
    </div>
  )
}

