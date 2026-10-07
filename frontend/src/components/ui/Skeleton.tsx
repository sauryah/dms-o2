import React from 'react'
import { clsx } from 'clsx'

export interface SkeletonProps {
  width?: string
  height?: string
  rounded?: boolean
  className?: string
}

export function Skeleton({
  width = 'w-full',
  height = 'h-4',
  rounded = false,
  className = ''
}: SkeletonProps) {
  return (
    <div 
      aria-hidden="true"
      className={clsx(
        'bg-[var(--color-surface-2)] animate-pulse shrink-0 pointer-events-none',
        width,
        height,
        rounded ? 'rounded-sm' : 'rounded-none',
        className
      )}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-sm space-y-3 h-full">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-8 w-8 shrink-0" />
      </div>
      <div className="border-t border-[var(--color-border)] pt-3 mt-2 grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-2 w-12" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="border-b border-[var(--color-border)] bg-transparent">
      {[...Array(cols)].map((_, i) => (
        <td key={i} className="py-2.5 px-3">
          <Skeleton className="h-3.5 w-5/6" />
        </td>
      ))}
    </tr>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm overflow-hidden animate-fadeIn">
      <div className="py-2.5 px-3 border-b border-[var(--color-border-visible)] bg-[var(--color-bg)] flex gap-4">
        {[...Array(cols)].map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      <table className="w-full text-left border-collapse">
        <tbody className="divide-y divide-[var(--color-border)]">
          {[...Array(rows)].map((_, i) => (
            <TableRowSkeleton key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

