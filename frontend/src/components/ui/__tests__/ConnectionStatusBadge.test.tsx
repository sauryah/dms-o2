import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { ConnectionStatusBadge } from '../../ConnectionStatusBadge'

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'mock-token' })
}))

describe('ConnectionStatusBadge', () => {
  test('renders LIVE when connected', () => {
    render(<ConnectionStatusBadge />)
    expect(screen.getByText('LIVE')).toBeInTheDocument()
  })

  test('updates status to SYNCING on reconnecting event', () => {
    render(<ConnectionStatusBadge />)
    act(() => {
      window.dispatchEvent(new CustomEvent('sse-status', { detail: { status: 'reconnecting' } }))
    })
    expect(screen.getByText('SYNCING')).toBeInTheDocument()
  })

  test('updates status to OFFLINE on disconnected event', () => {
    render(<ConnectionStatusBadge />)
    act(() => {
      window.dispatchEvent(new CustomEvent('sse-status', { detail: { status: 'disconnected' } }))
    })
    expect(screen.getByText('OFFLINE')).toBeInTheDocument()
  })
})
