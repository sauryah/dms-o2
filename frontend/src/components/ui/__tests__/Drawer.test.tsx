import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { Drawer } from '../Drawer'

describe('Drawer', () => {
  test('renders title and children when open', () => {
    render(
      <Drawer open={true} onClose={vi.fn()} title="Edit Die Specs">
        <div>Drawer Content Details</div>
      </Drawer>
    )
    expect(screen.getByText('Edit Die Specs')).toBeInTheDocument()
    expect(screen.getByText('Drawer Content Details')).toBeInTheDocument()
  })

  test('does not render when closed', () => {
    const { container } = render(
      <Drawer open={false} onClose={vi.fn()} title="Closed">
        <div>Closed Content</div>
      </Drawer>
    )
    expect(container.firstChild).toBeNull()
  })

  test('calls onClose when close cross is clicked', () => {
    const handleClose = vi.fn()
    render(
      <Drawer open={true} onClose={handleClose} title="Close test">
        <div>Content</div>
      </Drawer>
    )
    const closeBtn = screen.getByLabelText('Close panel')
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  test('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn()
    render(
      <Drawer open={true} onClose={handleClose} title="Esc test">
        <div>Content</div>
      </Drawer>
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
