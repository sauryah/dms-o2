import React from 'react'
import { render, act } from '@testing-library/react'
import { useApi, AuthProvider } from './App'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

interface TestApiComponentProps {
  url: string
  onResult: (res: any) => void
  onError: (err: any) => void
}

// Helper component to execute request inside the auth context
function TestApiComponent({ url, onResult, onError }: TestApiComponentProps) {
  const { request } = useApi()
  
  const trigger = async () => {
    try {
      const res = await request(url)
      onResult(res)
    } catch (err) {
      onError(err)
    }
  }

  return <button onClick={trigger}>Trigger Request</button>
}

describe('Auth Redirect on 401', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('401 response sets token to null and redirects to /login', async () => {
    // Mock fetch to return 401
    const mockFetch = vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({ detail: 'Unauthorized' })
    })
    vi.stubGlobal('fetch', mockFetch)

    // Track hash changes using stubGlobal
    const mockLocation = { hash: '' }
    vi.stubGlobal('location', mockLocation)

    const onResult = vi.fn()
    const onError = vi.fn()

    const { getByText } = render(
      <AuthProvider>
        <TestApiComponent url="/api/dies/" onResult={onResult} onError={onError} />
      </AuthProvider>
    )

    // Trigger api call
    const button = getByText('Trigger Request')
    await act(async () => {
      button.click()
    })

    // Expect fetch to be called
    expect(mockFetch).toHaveBeenCalled()

    // Expect onError to be called with Unauthorized
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
    expect(onError.mock.calls[0][0].message).toBe('Unauthorized')

    // Expect hash redirect
    expect(window.location.hash).toBe('/login')
  })
})
