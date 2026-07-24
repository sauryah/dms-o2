import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { DieCard } from '../DieCard'

describe('DieCard', () => {
  const roundDie = {
    die_id: '563214',
    die_type: 'ROUND',
    current_size: '2.420',
    casing: '25x10',
    status: 'AVAILABLE',
    rack_name: 'Rack A',
    shelf: 3,
    set_name: 'Set A01',
    machine_name: 'Machine M1'
  }

  const flatDie = {
    die_id: '884321',
    die_type: 'FLAT',
    current_width: '12.500',
    current_thickness: '2.400',
    casing: '50x15',
    status: 'RUNNING',
    rack_name: 'Rack B',
    shelf: 1,
    set_name: 'Set B01',
    machine_name: 'Machine M2'
  }

  test('renders round die details correctly', () => {
    render(<DieCard die={roundDie} />)
    expect(screen.getByText('2.420 mm')).toBeInTheDocument()
    expect(screen.getByText('563214')).toBeInTheDocument()
    expect(screen.getByText('Set A01')).toBeInTheDocument()
    expect(screen.getByText('Machine M1')).toBeInTheDocument()
    expect(screen.getByText('AVAILABLE')).toBeInTheDocument()
  })

  test('renders flat die details correctly', () => {
    render(<DieCard die={flatDie} />)
    expect(screen.getByText('12.500 × 2.400 mm')).toBeInTheDocument()
    expect(screen.getByText('884321')).toBeInTheDocument()
    expect(screen.getByText('RUNNING')).toBeInTheDocument()
  })

  test('calls onClick when card is clicked', () => {
    const handleClick = vi.fn()
    const { container } = render(<DieCard die={roundDie} onClick={handleClick} />)
    fireEvent.click(container.firstChild!)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
