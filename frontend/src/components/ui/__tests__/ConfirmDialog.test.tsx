import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { ConfirmDialog } from '../ConfirmDialog'

describe('ConfirmDialog', () => {
  test('renders dialog details when open', () => {
    render(
      <ConfirmDialog 
        open={true} 
        title="Override Database" 
        message="Are you sure you want to write changes?" 
        confirmLabel="Apply" 
        cancelLabel="Discard" 
        onConfirm={vi.fn()} 
        onCancel={vi.fn()} 
      />
    )
    expect(screen.getByText('Override Database')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to write changes?')).toBeInTheDocument()
    expect(screen.getByText('Apply')).toBeInTheDocument()
    expect(screen.getByText('Discard')).toBeInTheDocument()
  })

  test('calls onConfirm when confirm is clicked', () => {
    const handleConfirm = vi.fn()
    render(
      <ConfirmDialog 
        open={true} 
        title="Confirm action" 
        message="Test message" 
        onConfirm={handleConfirm} 
        onCancel={vi.fn()} 
      />
    )
    fireEvent.click(screen.getByText('Confirm'))
    expect(handleConfirm).toHaveBeenCalledTimes(1)
  })

  test('calls onCancel when cancel is clicked', () => {
    const handleCancel = vi.fn()
    render(
      <ConfirmDialog 
        open={true} 
        title="Confirm action" 
        message="Test message" 
        onConfirm={vi.fn()} 
        onCancel={handleCancel} 
      />
    )
    fireEvent.click(screen.getByText('Cancel'))
    expect(handleCancel).toHaveBeenCalledTimes(1)
  })
})
