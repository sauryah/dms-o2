import React from 'react'

export interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normStatus = (status || '').toUpperCase()

  // Map each status value to its color variable token name
  const statusTokenMap: Record<string, string> = {
    AVAILABLE: 'var(--color-available)',
    RUNNING: 'var(--color-running)',
    CLEANING: 'var(--color-cleaning)',
    POLISHING: 'var(--color-polishing)',
    DAMAGED: 'var(--color-damaged)',
    SCRAPPED: 'var(--color-scrapped)',
    MISSING: 'var(--color-missing)',
    MAINTENANCE: 'var(--color-cleaning)', // Map MAINTENANCE to cleaning yellow
  }

  const tokenColor = statusTokenMap[normStatus] || 'var(--color-muted)'

  return (
    <span 
      style={{ 
        backgroundColor: `rgba(from ${tokenColor} r g b / 0.1)`, 
        borderColor: `rgba(from ${tokenColor} r g b / 0.25)`,
        color: tokenColor
      }}
      className="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold font-mono tracking-wider select-none"
    >
      {normStatus}
    </span>
  )
}
