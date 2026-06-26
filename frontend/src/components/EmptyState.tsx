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
  icon = <FolderOpen className="h-10 w-10 text-slate-500" />,
  title,
  description,
  action
}: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-6 bg-slate-900/40 border border-slate-800 rounded-2xl p-8 shadow-xl flex flex-col justify-center items-center max-w-lg mx-auto animate-fadeIn">
      <div className="p-4 bg-slate-950 border border-slate-850 rounded-full mb-4 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2 font-heading">{title}</h3>
      <p className="text-slate-400 text-sm max-w-sm mb-6 leading-relaxed font-sans">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition shadow-lg shadow-blue-600/15 hover:shadow-blue-600/25 active:scale-95 btn-glow focus-ring"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
