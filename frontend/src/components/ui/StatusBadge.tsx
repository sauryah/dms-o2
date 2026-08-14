import React from 'react'

export interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md' | 'lg' | string
  className?: string
}

export function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  const normStatus = (status || '').toUpperCase()

  const statusStyleMap: Record<string, { color: string; backgroundColor: string; borderColor: string; dotColor: string }> = {
    AVAILABLE:   { color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.3)', dotColor: '#10b981' },
    RUNNING:     { color: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.3)', dotColor: '#3b82f6' },
    CLEANING:    { color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.3)', dotColor: '#f59e0b' },
    POLISHING:   { color: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.08)', borderColor: 'rgba(139, 92, 246, 0.3)', dotColor: '#8b5cf6' },
    DAMAGED:     { color: '#f97316', backgroundColor: 'rgba(249, 115, 22, 0.08)', borderColor: 'rgba(249, 115, 22, 0.3)', dotColor: '#f97316' },
    SCRAPPED:    { color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)', dotColor: '#ef4444' },
    MISSING:     { color: '#6b7280', backgroundColor: 'rgba(107, 114, 128, 0.08)', borderColor: 'rgba(107, 114, 128, 0.3)', dotColor: '#6b7280' },
    MAINTENANCE: { color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.3)', dotColor: '#f59e0b' },
    OPEN:        { color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.3)', dotColor: '#10b981' },
    CLOSED:      { color: '#6b7280', backgroundColor: 'rgba(107, 114, 128, 0.08)', borderColor: 'rgba(107, 114, 128, 0.3)', dotColor: '#6b7280' },
    PRE:         { color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.3)', dotColor: '#f59e0b' },
  }

  const styleConfig = statusStyleMap[normStatus] || {
    color: '#6b7280',
    backgroundColor: 'rgba(107, 114, 128, 0.08)',
    borderColor: '#2a2a2a',
    dotColor: '#6b7280',
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
