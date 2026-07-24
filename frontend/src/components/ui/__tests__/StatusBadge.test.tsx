import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, test, expect } from 'vitest'
import { StatusBadge } from '../StatusBadge'

describe('StatusBadge', () => {
  test('renders status text in uppercase', () => {
    render(<StatusBadge status="available" />)
    expect(screen.getByText('AVAILABLE')).toBeInTheDocument()
  })

  test('applies custom background styling', () => {
    const { container } = render(<StatusBadge status="RUNNING" />)
    const span = container.querySelector('span')
    expect(span).toHaveStyle('color: var(--color-running)')
  })
})
