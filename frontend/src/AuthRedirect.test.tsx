import React from 'react'
import { render, act } from '@testing-library/react'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/AuthContext'
import { useApi } from './hooks/useApi'
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

function TestAuthComponent() {
  const { token, role, username, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="token">{token}</span>
      <span data-testid="role">{role}</span>
      <span data-testid="username">{username}</span>
      <button onClick={() => login('new_token', 'admin', 'john_doe')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

describe('Auth Redirect on 401', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
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

  test('initializes state from localStorage and updates localStorage on changes', async () => {
    localStorage.setItem('dms_token', 'test-token')
    localStorage.setItem('dms_role', 'operator')
    localStorage.setItem('dms_username', 'bob')

    const { getByTestId, getByText } = render(
      <AuthProvider>
        <TestAuthComponent />
      </AuthProvider>
    )

    expect(getByTestId('token').textContent).toBe('test-token')
    expect(getByTestId('role').textContent).toBe('operator')
    expect(getByTestId('username').textContent).toBe('bob')

    // Trigger login
    await act(async () => {
      getByText('Login').click()
    })

    expect(localStorage.getItem('dms_token')).toBe('new_token')
    expect(localStorage.getItem('dms_role')).toBe('admin')
    expect(localStorage.getItem('dms_username')).toBe('john_doe')

    // Trigger logout
    await act(async () => {
      getByText('Logout').click()
    })

    expect(localStorage.getItem('dms_token')).toBeNull()
    expect(localStorage.getItem('dms_role')).toBeNull()
    expect(localStorage.getItem('dms_username')).toBeNull()
  })
})
