import React from 'react'
import { render, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useRealtimeSync } from '../useRealtimeSync'
import { ApiError } from '../useApi'

const mockRequest = vi.fn()
let mockToken: string | null = 'mock-jwt-token'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    token: mockToken,
  }),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    token: mockToken,
  }),
}))

vi.mock('../useApi', () => ({
  useApi: () => ({
    request: mockRequest,
  }),
  ApiError: class ApiError extends Error {
    type: string
    status?: number
    constructor(msg: string, type: string, status?: number) {
      super(msg)
      this.type = type
      this.status = status
    }
  },
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}))

function TestSyncComponent({
  onToast = vi.fn(),
  onNotification = vi.fn(),
  onAnnounce = vi.fn(),
}: {
  onToast?: () => void
  onNotification?: () => void
  onAnnounce?: () => void
}) {
  useRealtimeSync({
    onShowToast: onToast,
    onAddNotification: onNotification,
    onAnnounce: onAnnounce,
  })
  return <div data-testid="sync-component">Sync Active</div>
}

describe('useRealtimeSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockToken = 'mock-jwt-token'
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not request SSE ticket when token is null', () => {
    mockToken = null
    render(<TestSyncComponent />)

    expect(mockRequest).not.toHaveBeenCalled()
  })

  it('halts reconnection attempts on 401 unauthorized error', async () => {
    mockToken = 'expired-token'
    mockRequest.mockRejectedValueOnce(new ApiError('Unauthorized', 'unauthorized', 401))

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await act(async () => {
      render(<TestSyncComponent />)
    })

    expect(mockRequest).toHaveBeenCalledTimes(1)

    // Advance timers by 1 minute - should NOT retry
    await act(async () => {
      vi.advanceTimersByTime(60000)
    })

    expect(mockRequest).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('SSE ticket request unauthorized (401)')
    )

    warnSpy.mockRestore()
  })
})
