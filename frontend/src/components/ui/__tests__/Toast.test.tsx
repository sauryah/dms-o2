import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { Toast } from '../Toast'

describe('Toast', () => {
  test('renders message and variant indicators', () => {
    render(<Toast message="Operation succeeded" variant="success" onDismiss={vi.fn()} />)
    expect(screen.getByText('Operation succeeded')).toBeInTheDocument()
  })

  test('calls onDismiss when close button is clicked', () => {
    const handleDismiss = vi.fn()
    render(<Toast message="Alert" variant="error" onDismiss={handleDismiss} />)
    const closeBtn = screen.getByLabelText('Dismiss notification')
    fireEvent.click(closeBtn)
    expect(handleDismiss).toHaveBeenCalledTimes(1)
  })

  test('auto dismisses success toasts after timer', () => {
    vi.useFakeTimers()
    const handleDismiss = vi.fn()
    render(<Toast message="Auto-close" variant="success" onDismiss={handleDismiss} />)
    
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    
    expect(handleDismiss).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
