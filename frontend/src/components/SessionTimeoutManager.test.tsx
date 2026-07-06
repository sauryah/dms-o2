import React from 'react'
import { render, act } from '@testing-library/react'
import { SessionTimeoutManager } from './SessionTimeoutManager'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import { useNavigate } from 'react-router-dom'

// Mock the modules
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}))

vi.mock('../hooks/useApi', () => ({
  useApi: vi.fn()
}))

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn()
}))

describe('SessionTimeoutManager', () => {
  const mockLogout = vi.fn()
  const mockRequest = vi.fn()
  const mockNavigate = vi.fn()
  let currentToken: string | null = null

  beforeEach(() => {
    vi.useFakeTimers()
    mockLogout.mockClear()
    mockRequest.mockClear()
    mockNavigate.mockClear()
    currentToken = null

    vi.mocked(useAuth).mockReturnValue({
      token: currentToken,
      refreshToken: null,
      logout: mockLogout,
      role: 'admin',
      username: 'test',
      userId: 1,
      setToken: vi.fn(),
      setRefreshToken: vi.fn(),
      login: vi.fn()
    })

    vi.mocked(useApi).mockReturnValue({
      request: mockRequest
    })

    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should reset idle timer when token changes from null to valid', () => {
    // 1. Render with no token (user logged out/not logged in yet)
    currentToken = null
    vi.mocked(useAuth).mockReturnValue({
      token: currentToken,
      refreshToken: null,
      logout: mockLogout,
      role: null,
      username: null,
      userId: null,
      setToken: vi.fn(),
      setRefreshToken: vi.fn(),
      login: vi.fn()
    })

    const { rerender } = render(<SessionTimeoutManager />)

    // 2. Advance time by 35 minutes while logged out (simulating user staying on login page)
    act(() => {
      vi.advanceTimersByTime(35 * 60 * 1000)
    })

    // 3. Log in (token becomes valid)
    currentToken = 'valid-token'
    vi.mocked(useAuth).mockReturnValue({
      token: currentToken,
      refreshToken: 'valid-refresh',
      logout: mockLogout,
      role: 'admin',
      username: 'test',
      userId: 1,
      setToken: vi.fn(),
      setRefreshToken: vi.fn(),
      login: vi.fn()
    })

    act(() => {
      rerender(<SessionTimeoutManager />)
    })

    // 4. Advance time by 1 second (triggers the interval check)
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // 5. Assert that logout has NOT been called because the timer was reset on login!
    expect(mockLogout).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()

    // 6. Advance by 27 minutes (total 27m 1s after login). Should still be active.
    act(() => {
      vi.advanceTimersByTime(27 * 60 * 1000)
    })
    expect(mockLogout).not.toHaveBeenCalled()

    // 7. Advance past IDLE_LIMIT (28 minutes) + WARNING_LIMIT (2 minutes) -> 30 minutes total since login
    // Let's go to 30 minutes and 1 second after login (we need to advance another 3 minutes)
    act(() => {
      vi.advanceTimersByTime(3 * 60 * 1000)
    })

    // 8. Assert that logout and navigate to login were called
    expect(mockLogout).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})
