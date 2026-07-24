import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { FilterChip } from '../FilterChip'

describe('FilterChip', () => {
  test('renders label text', () => {
    render(<FilterChip label="casing: 25x10" onRemove={vi.fn()} />)
    expect(screen.getByText('casing: 25x10')).toBeInTheDocument()
  })

  test('calls onRemove when dismiss cross is clicked', () => {
    const handleRemove = vi.fn()
    render(<FilterChip label="test" onRemove={handleRemove} />)
    const removeBtn = screen.getByRole('button')
    fireEvent.click(removeBtn)
    expect(handleRemove).toHaveBeenCalledTimes(1)
  })
})
