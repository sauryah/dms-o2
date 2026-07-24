import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { RangeFilter } from '../RangeFilter'

describe('RangeFilter', () => {
  test('renders label and unit text inside inputs', () => {
    render(
      <RangeFilter 
        label="Size Range" 
        minValue="2.1" 
        maxValue="5.5" 
        onMinChange={vi.fn()} 
        onMaxChange={vi.fn()} 
        unit="mm" 
      />
    )
    expect(screen.getByText('Size Range')).toBeInTheDocument()
    expect(screen.getAllByText('mm').length).toBe(2)
  })

  test('calls onMinChange and onMaxChange callbacks', () => {
    const handleMinChange = vi.fn()
    const handleMaxChange = vi.fn()
    render(
      <RangeFilter 
        label="Size Range" 
        minValue="" 
        maxValue="" 
        onMinChange={handleMinChange} 
        onMaxChange={handleMaxChange} 
      />
    )
    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.change(inputs[0], { target: { value: '1.5' } })
    fireEvent.change(inputs[1], { target: { value: '3.2' } })
    expect(handleMinChange).toHaveBeenCalledWith('1.5')
    expect(handleMaxChange).toHaveBeenCalledWith('3.2')
  })
})
