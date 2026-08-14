import React from 'react'
import { FolderOpen } from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({
  icon = <FolderOpen className="h-8 w-8 text-[#6b7280]" />,
  title,
  description,
  action
}: EmptyStateProps) {
  return (
    <div className="text-center py-10 px-6 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm flex flex-col justify-center items-center max-w-lg mx-auto animate-fadeIn font-mono">
      <div className="p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm mb-3 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-sm font-medium text-[#e4e4e4] uppercase tracking-[0.05em] mb-1 font-mono">{title}</h3>
      <p className="text-[#6b7280] text-xs max-w-sm mb-4 leading-relaxed font-mono">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="bg-[#141414] hover:bg-[#1f1f1f] border border-blue-500/60 text-blue-400 hover:text-blue-300 px-4 py-1.5 rounded-sm text-xs uppercase font-mono tracking-wider transition focus-ring cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
