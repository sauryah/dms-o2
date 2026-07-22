import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { RoundDieCard } from './RoundDieCard'
import { describe, test, expect, vi } from 'vitest'

describe('RoundDieCard', () => {
  const mockDie = {
    die_id: 'R-101',
    status: 'AVAILABLE',
    current_size: '2.500',
    casing: '25x10',
    rack_name: 'Rack A',
    shelf: 3,
    set_name: 'Set Alpha',
    machine_name: 'Machine One'
  }

  test('renders size, die_id, casing, set, machine, status', () => {
    const handleClick = vi.fn()
    render(<RoundDieCard die={mockDie as any} onClick={handleClick} />)

    // Check die_id and status
    expect(screen.getByText('R-101')).toBeInTheDocument()
    expect(screen.getByText('AVAILABLE')).toBeInTheDocument()

    // Check size, casing, location
    expect(screen.getByText('2.500 mm')).toBeInTheDocument()
    expect(screen.getByText('25x10')).toBeInTheDocument()
    expect(screen.getByText('Rack A - Shelf 3')).toBeInTheDocument()

    // Check set and machine
    expect(screen.getByText('Set Alpha (Machine One)')).toBeInTheDocument()

    // Test click interaction
    fireEvent.click(screen.getByText('R-101'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
