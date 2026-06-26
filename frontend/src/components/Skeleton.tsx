import React from 'react'
import { clsx } from 'clsx'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-skeleton bg-slate-800 rounded-lg pointer-events-none',
        className
      )}
      aria-hidden="true"
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-850 p-6 rounded-xl space-y-4 h-full">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-10 w-10 shrink-0" />
      </div>
      <div className="border-t border-slate-800/80 pt-4 mt-2 grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-2 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="border-b border-slate-800/60 bg-slate-900/20">
      {[...Array(cols)].map((_, i) => (
        <td key={i} className="py-4 px-6">
          <Skeleton className="h-4 w-5/6" />
        </td>
      ))}
    </tr>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden animate-fadeIn">
      <div className="py-4 px-6 border-b border-slate-800 bg-slate-950/40 flex gap-4">
        {[...Array(cols)].map((_, i) => (
          <Skeleton key={i} className="h-3 w-24" />
        ))}
      </div>
      <table className="w-full text-left border-collapse">
        <tbody className="divide-y divide-slate-800/60">
          {[...Array(rows)].map((_, i) => (
            <TableRowSkeleton key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
