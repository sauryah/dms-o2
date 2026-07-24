import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { DataTable, Column } from '../DataTable'

describe('DataTable', () => {
  const columns: Column[] = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'name', label: 'Name' }
  ]

  const rows = [
    { id: '1', name: 'Alpha' },
    { id: '2', name: 'Beta' }
  ]

  test('renders column headers and row data', () => {
    render(<DataTable columns={columns} rows={rows} />)
    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  test('calls onRowClick when row is clicked', () => {
    const handleRowClick = vi.fn()
    render(<DataTable columns={columns} rows={rows} onRowClick={handleRowClick} />)
    fireEvent.click(screen.getByText('Alpha'))
    expect(handleRowClick).toHaveBeenCalledWith({ id: '1', name: 'Alpha' })
  })

  test('calls onSort when sortable header is clicked', () => {
    const handleSort = vi.fn()
    render(<DataTable columns={columns} rows={rows} onSort={handleSort} sortField="id" sortOrder="asc" />)
    fireEvent.click(screen.getByText('ID'))
    expect(handleSort).toHaveBeenCalledWith('id')
  })

  test('renders loading skeleton state', () => {
    const { container } = render(<DataTable columns={columns} rows={[]} loading={true} />)
    // Check that shimmer pulse elements exist
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })
})
