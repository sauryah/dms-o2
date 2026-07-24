import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { EmptyState } from '../EmptyState'

describe('EmptyState', () => {
  test('renders message', () => {
    render(<EmptyState message="No dies found." />)
    expect(screen.getByText('No dies found.')).toBeInTheDocument()
  })

  test('renders action button and triggers callback', () => {
    const handleAction = vi.fn()
    render(
      <EmptyState 
        message="No items matching criteria." 
        actionLabel="Reset Search" 
        onAction={handleAction} 
      />
    )
    expect(screen.getByText('Reset Search')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Reset Search'))
    expect(handleAction).toHaveBeenCalledTimes(1)
  })
})
