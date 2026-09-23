import React, { useRef, useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { useFocusTrap } from '../useFocusTrap'

interface TestComponentProps {
  enabled?: boolean
  onEscape?: () => void
}

function TestTrapComponent({ enabled = true, onEscape }: TestComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  useFocusTrap(containerRef, { enabled, onEscape })

  return (
    <div>
      <button data-testid="outside-btn">Outside</button>
      <div ref={containerRef} tabIndex={-1} data-testid="trap-container">
        <button data-testid="btn-1">First</button>
        <button data-testid="btn-2">Second</button>
        <button data-testid="btn-3">Third</button>
      </div>
    </div>
  )
}

describe('useFocusTrap', () => {
  test('focuses first element on mount when enabled', () => {
    render(<TestTrapComponent enabled={true} />)
    expect(document.activeElement).toBe(screen.getByTestId('btn-1'))
  })

  test('calls onEscape when Escape key is pressed', () => {
    const handleEscape = vi.fn()
    render(<TestTrapComponent enabled={true} onEscape={handleEscape} />)
    
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(handleEscape).toHaveBeenCalledTimes(1)
  })

  test('cycles focus within container on Tab and Shift+Tab', () => {
    render(<TestTrapComponent enabled={true} />)
    const btn1 = screen.getByTestId('btn-1')
    const btn3 = screen.getByTestId('btn-3')

    // Currently at btn1. Shift+Tab should wrap to btn3
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(btn3)

    // Now at btn3. Tab should wrap to btn1
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: false })
    expect(document.activeElement).toBe(btn1)
  })
})
