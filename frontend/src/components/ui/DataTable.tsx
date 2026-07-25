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
  // Selection props
  selectedIds?: Set<string>
  onSelectId?: (id: string, checked: boolean) => void
  onSelectAll?: (checked: boolean) => void
}

export function DataTable({
  columns,
  rows,
  onRowClick,
  loading = false,
  emptyMessage = 'No records found.',
  sortField,
  sortOrder,
  onSort,
  selectedIds,
  onSelectId,
  onSelectAll
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
            <tr className="sticky top-0 z-10 bg-slate-955 border-b border-[var(--color-border)] select-none">
              {selectedIds && onSelectAll && (
                <th className="py-4 px-5 w-12 text-center align-middle">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && rows.every(row => selectedIds.has(String(row.die_id || row.id)))}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--color-border)] bg-slate-950 text-blue-500 focus:ring-blue-900 cursor-pointer"
                  />
                </th>
              )}
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
                  {selectedIds && onSelectAll && (
                    <td className="py-4 px-5 w-12 text-center align-middle">
                      <Skeleton width="w-4" height="h-4" />
                    </td>
                  )}
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
                <td colSpan={columns.length + (selectedIds ? 1 : 0)} className="p-0">
                  <div className="py-16">
                    <EmptyState message={emptyMessage} />
                  </div>
                </td>
              </tr>
            ) : (
              // Normal rows
              rows.map((row, rIdx) => {
                const rowId = String(row.die_id || row.id)
                const isSelected = selectedIds?.has(rowId) ?? false
                return (
                  <tr
                    key={row.id || row.die_id || rIdx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`group transition-colors duration-150 ${
                      onRowClick ? 'cursor-pointer hover:bg-[var(--color-surface-2)]/30' : ''
                    } ${isSelected ? 'bg-blue-950/20' : rIdx % 2 === 0 ? 'bg-transparent' : 'bg-[var(--color-surface-2)]/10'}`}
                  >
                    {selectedIds && onSelectId && (
                      <td 
                        className="py-3.5 px-5 w-12 text-center align-middle"
                        onClick={(e) => e.stopPropagation()} // Prevent triggering onRowClick
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => onSelectId(rowId, e.target.checked)}
                          className="h-4 w-4 rounded border-[var(--color-border)] bg-slate-950 text-blue-500 focus:ring-blue-900 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td 
                        key={col.key} 
                        className="py-3.5 px-5 text-sm text-[var(--color-text)] font-semibold font-sans align-middle"
                      >
                        {col.render ? col.render(row) : (row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
