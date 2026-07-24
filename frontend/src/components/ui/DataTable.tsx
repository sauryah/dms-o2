import React from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Skeleton } from './Skeleton'
import { EmptyState } from './EmptyState'

export interface Column {
  key: string
  label: string
  sortable?: boolean
  render?: (row: any) => React.ReactNode
}

export interface DataTableProps {
  columns: Column[]
  rows: any[]
  onRowClick?: (row: any) => void
  loading?: boolean
  emptyMessage?: string
  sortField?: string
  sortOrder?: 'asc' | 'desc' | string
  onSort?: (field: string) => void
}

export function DataTable({
  columns,
  rows,
  onRowClick,
  loading = false,
  emptyMessage = 'No records found.',
  sortField,
  sortOrder,
  onSort
}: DataTableProps) {
  const handleHeaderClick = (col: Column) => {
    if (col.sortable && onSort) {
      onSort(col.key)
    }
  }

  const renderSortIcon = (col: Column) => {
    if (!col.sortable) return null
    if (sortField !== col.key) {
      return <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-40 shrink-0" />
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-blue-400 shrink-0" />
      : <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-blue-400 shrink-0" />
  }

  return (
    <div className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-xl">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="sticky top-0 z-10 bg-slate-950 border-b border-[var(--color-border)] select-none">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleHeaderClick(col)}
                  className={`py-4 px-5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] font-mono ${
                    col.sortable ? 'cursor-pointer hover:text-[var(--color-text)] transition-colors' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <span>{col.label}</span>
                    {renderSortIcon(col)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]/50">
            {loading ? (
              // Loading state: render 5 rows of Skeleton block cells
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="bg-transparent">
                  {columns.map((col) => (
                    <td key={col.key} className="py-4 px-5">
                      <Skeleton width="w-2/3" height="h-4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <div className="py-16">
                    <EmptyState message={emptyMessage} />
                  </div>
                </td>
              </tr>
            ) : (
              // Normal rows
              rows.map((row, rIdx) => (
                <tr
                  key={row.id || row.die_id || rIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`group transition-colors duration-150 ${
                    onRowClick ? 'cursor-pointer hover:bg-[var(--color-surface-2)]/30' : ''
                  } ${rIdx % 2 === 0 ? 'bg-transparent' : 'bg-[var(--color-surface-2)]/10'}`}
                >
                  {columns.map((col) => (
                    <td 
                      key={col.key} 
                      className="py-3.5 px-5 text-sm text-[var(--color-text)] font-semibold font-sans align-middle"
                    >
                      {col.render ? col.render(row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
