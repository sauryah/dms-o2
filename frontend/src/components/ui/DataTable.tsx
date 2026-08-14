import React from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Skeleton } from './Skeleton'
import { EmptyState } from './EmptyState'

export interface Column {
  key: string
  label: string
  sortable?: boolean
  render?: (row: any) => React.ReactNode
  isNumeric?: boolean
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
      return <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40 shrink-0" />
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="ml-1.5 h-3 w-3 text-blue-500 shrink-0" />
      : <ArrowDown className="ml-1.5 h-3 w-3 text-blue-500 shrink-0" />
  }

  return (
    <div className="w-full bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-[#2a2a2a] select-none">
              {selectedIds && onSelectAll && (
                <th className="py-2.5 px-3 w-10 text-center align-middle">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && rows.every(row => selectedIds.has(String(row.die_id || row.id)))}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="h-3.5 w-3.5 rounded-none border-[#2a2a2a] bg-[#0f0f0f] text-blue-500 focus:ring-0 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleHeaderClick(col)}
                  className={`py-2.5 px-3 text-[11px] font-medium uppercase tracking-wider text-[#6b7280] font-mono ${
                    col.sortable ? 'cursor-pointer hover:text-[#e4e4e4] transition-colors' : ''
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
          <tbody className="divide-y divide-[#1a1a1a]">
            {loading ? (
              // Loading state: render 5 rows of Skeleton block cells
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="bg-transparent">
                  {selectedIds && onSelectAll && (
                    <td className="py-2 px-3 w-10 text-center align-middle">
                      <Skeleton width="w-3.5" height="h-3.5" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="py-2 px-3">
                      <Skeleton width="w-2/3" height="h-3.5" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={columns.length + (selectedIds ? 1 : 0)} className="p-0">
                  <div className="py-12">
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
                    className={`group transition-colors duration-100 ${
                      onRowClick ? 'cursor-pointer hover:bg-[#1a1a1a]' : ''
                    } ${isSelected ? 'bg-[#141414] border-l-2 border-l-blue-500' : 'bg-transparent hover:bg-[#1a1a1a]'}`}
                  >
                    {selectedIds && onSelectId && (
                      <td 
                        className="py-2 px-3 w-10 text-center align-middle"
                        onClick={(e) => e.stopPropagation()} // Prevent triggering onRowClick
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => onSelectId(rowId, e.target.checked)}
                          className="h-3.5 w-3.5 rounded-none border-[#2a2a2a] bg-[#0f0f0f] text-blue-500 focus:ring-0 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const val = row[col.key]
                      const isNumericVal = typeof val === 'number' || col.isNumeric || col.key.includes('size') || col.key.includes('width') || col.key.includes('thickness') || col.key.includes('id') || col.key.includes('count')
                      return (
                        <td 
                          key={col.key} 
                          className={`py-2 px-3 text-[13px] text-[#e4e4e4] align-middle ${
                            isNumericVal ? 'font-mono tracking-tight' : 'font-mono'
                          }`}
                        >
                          {col.render ? col.render(row) : (val ?? '—')}
                        </td>
                      )
                    })}
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
