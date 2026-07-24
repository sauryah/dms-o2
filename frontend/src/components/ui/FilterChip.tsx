import React from 'react'
import { X } from 'lucide-react'

export interface FilterChipProps {
  label: string
  onRemove: () => void
}

export function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800/80 text-xs text-[var(--color-text)] font-semibold px-2.5 py-1 rounded-xl transition duration-150 select-none">
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-[var(--color-muted)] hover:text-white hover:bg-slate-800 p-0.5 rounded transition shrink-0"
        aria-label={`Remove filter: ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
