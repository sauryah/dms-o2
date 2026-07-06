import { useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

export const useApi = () => {
  const { token, refreshToken, logout, setToken, setRefreshToken } = useAuth()
  const tokenRef = useRef(token)
  const refreshTokenRef = useRef(refreshToken)
  tokenRef.current = token
  refreshTokenRef.current = refreshToken

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const refreshAccessToken = async (): Promise<string | null> => {
    const currentRefresh = refreshTokenRef.current
    if (!currentRefresh) return null
    try {
      const res = await fetch('/api/auth/refresh/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: currentRefresh })
      })
      if (!res.ok) return null
      const data = await res.json()
      setToken(data.access)
      if (data.refresh) setRefreshToken(data.refresh)
      return data.access
    } catch {
      return null
    }
  }

  const request = useCallback(async (url: string, options: any = {}) => {
    const headers = { ...options.headers }
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }
    if (tokenRef.current) {
      headers['Authorization'] = `Bearer ${tokenRef.current}`
    }

    const maxRetries = 3
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await fetch(url, { ...options, headers })

        if (res.status === 401) {
          const newToken = await refreshAccessToken()
          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`
            const retryRes = await fetch(url, { ...options, headers })
            if (retryRes.status === 401) {
              logout()
              window.location.hash = '/login'
              throw new Error('Unauthorized')
            }
            if (retryRes.status === 204) return null
            const retryData = await retryRes.json()
            if (!options.keepMetadata && retryData && typeof retryData === 'object' && 'results' in retryData && Array.isArray(retryData.results)) {
              return retryData.results
            }
            return retryData
          }
          logout()
          window.location.hash = '/login'
          throw new Error('Unauthorized')
        }

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          let errMsg = errorData.detail || errorData.error
          if (!errMsg && typeof errorData === 'object' && errorData !== null) {
            const fieldErrors = Object.entries(errorData).map(([key, val]) => {
              const valStr = Array.isArray(val) ? val.join(', ') : String(val)
              return `${key}: ${valStr}`
            })
            if (fieldErrors.length > 0) {
              errMsg = fieldErrors.join('; ')
            }
          }
          lastError = new Error(errMsg || 'Request failed')

          if (res.status < 500 && res.status !== 429) {
            throw lastError
          }

          if (attempt === maxRetries - 1) {
            throw lastError
          }

          const delayMs = Math.pow(2, attempt) * 1000
          await sleep(delayMs)
          continue
        }

        if (res.status === 204) return null
        const data = await res.json()
        if (!options.keepMetadata && data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
          return data.results
        }
        return data
      } catch (error) {
        lastError = error as Error

        if (error instanceof TypeError || (error instanceof Error && error.message === 'Unauthorized')) {
          throw error
        }

        if (attempt === maxRetries - 1) {
          throw error
        }

        const delayMs = Math.pow(2, attempt) * 1000
        await sleep(delayMs)
      }
    }

    throw lastError || new Error('Request failed after retries')
  }, [logout, setToken, setRefreshToken])

  return { request }
}
