import React from 'react'

export interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md' | 'lg' | string
  className?: string
}

export function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  const normStatus = (status || '').toUpperCase()

  const statusStyleMap: Record<string, { color: string; backgroundColor: string; borderColor: string; dotColor: string }> = {
    AVAILABLE:   { color: 'var(--color-available)',   backgroundColor: 'var(--color-available-bg)',   borderColor: 'var(--color-available-bdr)',   dotColor: 'var(--color-available)' },
    RUNNING:     { color: 'var(--color-running)',     backgroundColor: 'var(--color-running-bg)',     borderColor: 'var(--color-running-bdr)',     dotColor: 'var(--color-running)' },
    CLEANING:    { color: 'var(--color-cleaning)',    backgroundColor: 'var(--color-cleaning-bg)',    borderColor: 'var(--color-cleaning-bdr)',    dotColor: 'var(--color-cleaning)' },
    POLISHING:   { color: 'var(--color-polishing)',   backgroundColor: 'var(--color-polishing-bg)',   borderColor: 'var(--color-polishing-bdr)',   dotColor: 'var(--color-polishing)' },
    DAMAGED:     { color: 'var(--color-damaged)',     backgroundColor: 'var(--color-damaged-bg)',     borderColor: 'var(--color-damaged-bdr)',     dotColor: 'var(--color-damaged)' },
    SCRAPPED:    { color: 'var(--color-scrapped)',    backgroundColor: 'var(--color-scrapped-bg)',    borderColor: 'var(--color-scrapped-bdr)',    dotColor: 'var(--color-scrapped)' },
    MISSING:     { color: 'var(--color-missing)',     backgroundColor: 'var(--color-missing-bg)',     borderColor: 'var(--color-missing-bdr)',     dotColor: 'var(--color-missing)' },
    MAINTENANCE: { color: 'var(--color-maintenance)', backgroundColor: 'var(--color-maintenance-bg)', borderColor: 'var(--color-maintenance-bdr)', dotColor: 'var(--color-maintenance)' },
    OPEN:        { color: 'var(--color-available)',   backgroundColor: 'var(--color-available-bg)',   borderColor: 'var(--color-available-bdr)',   dotColor: 'var(--color-available)' },
    CLOSED:      { color: 'var(--color-missing)',     backgroundColor: 'var(--color-missing-bg)',     borderColor: 'var(--color-missing-bdr)',     dotColor: 'var(--color-missing)' },
    PRE:         { color: 'var(--color-maintenance)', backgroundColor: 'var(--color-maintenance-bg)', borderColor: 'var(--color-maintenance-bdr)', dotColor: 'var(--color-maintenance)' },
  }

  const styleConfig = statusStyleMap[normStatus] || {
    color: 'var(--color-muted)',
    backgroundColor: 'var(--color-default-bg)',
    borderColor: 'var(--color-default-bdr)',
    dotColor: 'var(--color-muted)',
  }

  const sizeClasses = size === 'lg' ? 'px-2.5 py-1 text-xs gap-1.5' : size === 'md' ? 'px-2 py-0.5 text-xs gap-1.5' : 'px-1.5 py-0.5 text-[10px] gap-1'

  return (
    <span
      style={{ color: styleConfig.color, backgroundColor: styleConfig.backgroundColor, borderColor: styleConfig.borderColor }}
      className={`inline-flex items-center rounded-sm border font-medium font-mono tracking-wider select-none ${sizeClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: styleConfig.dotColor }} />
      {normStatus}
    </span>
  )
}
