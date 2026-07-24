import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, test, expect } from 'vitest'
import { PageHeader } from '../PageHeader'

describe('PageHeader', () => {
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Inventory', href: '/inventory' },
    { label: 'Die Detail' }
  ]

  test('renders title and breadcrumb items', () => {
    render(
      <MemoryRouter>
        <PageHeader title="Die 563214" breadcrumbs={breadcrumbs} />
      </MemoryRouter>
    )
    expect(screen.getByText('Die 563214')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Inventory')).toBeInTheDocument()
    expect(screen.getByText('Die Detail')).toBeInTheDocument()
  })

  test('renders actions slot content', () => {
    render(
      <MemoryRouter>
        <PageHeader 
          title="Actions Test" 
          actions={<button>Click Action</button>} 
        />
      </MemoryRouter>
    )
    expect(screen.getByText('Click Action')).toBeInTheDocument()
  })
})
