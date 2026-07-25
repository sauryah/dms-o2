import React from 'react'

export interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normStatus = (status || '').toUpperCase()

  const statusStyleMap: Record<string, { color: string; backgroundColor: string; borderColor: string }> = {
    AVAILABLE:   { color: 'var(--color-available)',   backgroundColor: 'var(--color-available-bg)',   borderColor: 'var(--color-available-bdr)' },
    RUNNING:     { color: 'var(--color-running)',     backgroundColor: 'var(--color-running-bg)',     borderColor: 'var(--color-running-bdr)' },
    CLEANING:    { color: 'var(--color-cleaning)',    backgroundColor: 'var(--color-cleaning-bg)',    borderColor: 'var(--color-cleaning-bdr)' },
    POLISHING:   { color: 'var(--color-polishing)',   backgroundColor: 'var(--color-polishing-bg)',   borderColor: 'var(--color-polishing-bdr)' },
    DAMAGED:     { color: 'var(--color-damaged)',     backgroundColor: 'var(--color-damaged-bg)',     borderColor: 'var(--color-damaged-bdr)' },
    SCRAPPED:    { color: 'var(--color-scrapped)',    backgroundColor: 'var(--color-scrapped-bg)',    borderColor: 'var(--color-scrapped-bdr)' },
    MISSING:     { color: 'var(--color-missing)',     backgroundColor: 'var(--color-missing-bg)',     borderColor: 'var(--color-missing-bdr)' },
    MAINTENANCE: { color: 'var(--color-maintenance)', backgroundColor: 'var(--color-maintenance-bg)', borderColor: 'var(--color-maintenance-bdr)' },
  }

  const style = statusStyleMap[normStatus] || {
    color: 'var(--color-muted)',
    backgroundColor: 'var(--color-default-bg)',
    borderColor: 'var(--color-default-bdr)',
  }

  return (
    <span
      style={style}
      className="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold font-mono tracking-wider select-none"
    >
      {normStatus}
    </span>
  )
}
