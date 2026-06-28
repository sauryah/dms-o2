import { useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

export const useApi = () => {
  const { token, setToken } = useAuth()
  const tokenRef = useRef(token)
  tokenRef.current = token

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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
          setToken(null)
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
  }, [setToken])

  return { request }
}
