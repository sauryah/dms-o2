import React from 'react'
import { X } from 'lucide-react'

export interface FilterChipProps {
  label: string
  onRemove: () => void
}

export function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-[#141414] border border-[#2a2a2a] text-xs text-[#e4e4e4] font-mono px-2 py-0.5 rounded-sm transition select-none">
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-[#6b7280] hover:text-[#e4e4e4] hover:bg-[#1f1f1f] p-0.5 rounded-sm transition shrink-0"
        aria-label={`Remove filter: ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
