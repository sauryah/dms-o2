import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { SearchBar } from '../SearchBar'

describe('SearchBar', () => {
  test('renders placeholder and value', () => {
    render(<SearchBar value="ceramic" onChange={vi.fn()} placeholder="Search dies..." />)
    const input = screen.getByPlaceholderText('Search dies...') as HTMLInputElement
    expect(input.value).toBe('ceramic')
  })

  test('calls onChange when text is typed', () => {
    const handleChange = vi.fn()
    render(<SearchBar value="" onChange={handleChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'flat' } })
    expect(handleChange).toHaveBeenCalledWith('flat')
  })

  test('calls onClear when clear button is clicked', () => {
    const handleClear = vi.fn()
    render(<SearchBar value="testing" onChange={vi.fn()} onClear={handleClear} />)
    const clearBtn = screen.getByLabelText('Clear search input')
    fireEvent.click(clearBtn)
    expect(handleClear).toHaveBeenCalledTimes(1)
  })
})
