import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { ExportMenu } from '../ExportMenu'
import { useToast } from '../../../contexts/ToastContext'

// Mock toast context
vi.mock('../../../contexts/ToastContext', () => ({
  useToast: vi.fn()
}))

describe('ExportMenu', () => {
  const showToastMock = vi.fn()

  beforeEach(() => {
    showToastMock.mockClear()
    vi.mocked(useToast).mockReturnValue({
      showToast: showToastMock,
      toasts: [],
      dismissToast: vi.fn()
    })
  })

  test('renders dropdown toggle button', () => {
    render(<ExportMenu options={[]} />)
    expect(screen.getByText('Export')).toBeInTheDocument()
  })

  test('toggles options dropdown on click', () => {
    const options = [
      { label: 'Export All', onSelect: vi.fn() }
    ]
    render(<ExportMenu options={options} />)
    
    // Dropdown should be hidden initially
    expect(screen.queryByText('Export All')).toBeNull()

    // Click to open
    fireEvent.click(screen.getByText('Export'))
    expect(screen.getByText('Export All')).toBeInTheDocument()
  })
})
