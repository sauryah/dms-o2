import React from 'react'
import { render } from '@testing-library/react'
import { describe, test, expect } from 'vitest'
import { Skeleton } from '../Skeleton'

describe('Skeleton', () => {
  test('renders with animate-pulse class', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toHaveClass('animate-pulse')
  })

  test('applies dimension classes', () => {
    const { container } = render(<Skeleton width="w-32" height="h-8" />)
    expect(container.firstChild).toHaveClass('w-32')
    expect(container.firstChild).toHaveClass('h-8')
  })
})
