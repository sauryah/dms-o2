import { useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

export class ApiError extends Error {
  type: 'network' | 'timeout' | 'http_4xx' | 'http_5xx' | 'unauthorized' | 'aborted' | 'unknown';
  status?: number;
  data?: unknown;

  constructor(
    message: string,
    type: 'network' | 'timeout' | 'http_4xx' | 'http_5xx' | 'unauthorized' | 'aborted' | 'unknown',
    status?: number,
    data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.status = status;
    this.data = data;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'signal'> {
  timeout?: number
  cancelKey?: string
  abortPrevious?: boolean
  keepMetadata?: boolean
  signal?: AbortSignal | null
}

let inflightRefresh: Promise<string | null> | null = null

export const useApi = () => {
  const { token, logout, setToken, handleRefreshFailure, shouldBlockRefresh, resetRefreshFailures } = useAuth()
  const tokenRef = useRef(token)
  tokenRef.current = token

  const activeRequestsRef = useRef<Map<string, AbortController>>(new Map())

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (inflightRefresh) {
      return inflightRefresh
    }

    if (shouldBlockRefresh()) {
      logout()
      window.location.hash = '/login'
      return null
    }

    inflightRefresh = (async () => {
      try {
        const res = await fetch('/api/v1/auth/refresh/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
        if (!res.ok) {
          let errData: { code?: string; evicted_by_ip?: string; evicted_at?: string } | null = null
          if (typeof res.json === 'function') {
            errData = (await res.json().catch(() => null)) as { code?: string; evicted_by_ip?: string; evicted_at?: string } | null
          }
          if (errData && errData.code === 'session_evicted') {
            localStorage.setItem('dms_logout_reason', 'session_evicted')
            if (errData.evicted_by_ip) {
              localStorage.setItem('dms_evicted_ip', errData.evicted_by_ip)
            }
            if (errData.evicted_at) {
              localStorage.setItem('dms_evicted_at', errData.evicted_at)
            }
          }
          handleRefreshFailure()
          return null
        }
        const data = (await res.json()) as { access: string }
        setToken(data.access)
        resetRefreshFailures()
        return data.access
      } catch {
        handleRefreshFailure()
        return null
      } finally {
        inflightRefresh = null
      }
    })()

    return inflightRefresh
  }, [handleRefreshFailure, logout, resetRefreshFailures, setToken, shouldBlockRefresh])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const request = useCallback(async <T = any>(url: string, options: RequestOptions = {}): Promise<T> => {
    const headers: Record<string, string> = { ...(options.headers as Record<string, string>) }
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }
    headers['X-Requested-With'] = 'XMLHttpRequest'
    if (tokenRef.current) {
      headers['Authorization'] = `Bearer ${tokenRef.current}`
    }

    let targetUrl = url
    if (url.startsWith('/api/') && !url.startsWith('/api/v1/') && !url.startsWith('/api/go/') && !url.startsWith('/api/events/')) {
      targetUrl = '/api/v1/' + url.substring(5)
    }

    const cancelKey = options.cancelKey || (options.abortPrevious ? url.split('?')[0] : undefined)
    const rapidAbortController = new AbortController()
    if (cancelKey) {
      const prevController = activeRequestsRef.current.get(cancelKey)
      if (prevController) {
        prevController.abort(new ApiError('Request aborted by a newer request', 'aborted'))
      }
      activeRequestsRef.current.set(cancelKey, rapidAbortController)
    }

    const maxRetries = 3
    let lastError: Error | null = null

    try {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const timeoutMs = options.timeout || 30000
        const timeoutController = new AbortController()
        const timeoutId = setTimeout(() => {
          timeoutController.abort(new ApiError('Request timed out', 'timeout'))
        }, timeoutMs)

        const loopController = new AbortController()
        const onAbort = () => {
          let reason: unknown = new ApiError('Request aborted', 'aborted')
          if (options.signal?.aborted) {
            reason = options.signal.reason || new ApiError('Request aborted', 'aborted')
          } else if (rapidAbortController.signal.aborted) {
            reason = rapidAbortController.signal.reason || new ApiError('Request aborted by a newer request', 'aborted')
          } else if (timeoutController.signal.aborted) {
            reason = timeoutController.signal.reason || new ApiError('Request timed out', 'timeout')
          }
          loopController.abort(reason)
        }

        if (options.signal?.aborted || rapidAbortController.signal.aborted || timeoutController.signal.aborted) {
          onAbort()
        } else {
          options.signal?.addEventListener('abort', onAbort)
          rapidAbortController.signal.addEventListener('abort', onAbort)
          timeoutController.signal.addEventListener('abort', onAbort)
        }

        try {
          const res = await fetch(targetUrl, { ...options, headers, signal: loopController.signal })

          if (res.status === 401) {
            let errData: { code?: string; evicted_by_ip?: string; evicted_at?: string; detail?: string } | null = null
            if (typeof res.clone === 'function') {
              const resClone = res.clone()
              errData = (await resClone.json().catch(() => null)) as { code?: string; evicted_by_ip?: string; evicted_at?: string; detail?: string } | null
            }
            if (errData && errData.code === 'session_evicted') {
              localStorage.setItem('dms_logout_reason', 'session_evicted')
              if (errData.evicted_by_ip) {
                localStorage.setItem('dms_evicted_ip', errData.evicted_by_ip)
              }
              if (errData.evicted_at) {
                localStorage.setItem('dms_evicted_at', errData.evicted_at)
              }
              logout()
              window.location.hash = '/login'
              throw new ApiError(errData.detail || 'Session evicted', 'unauthorized', 401)
            }

            const newToken = await refreshAccessToken()
            if (newToken) {
              headers['Authorization'] = `Bearer ${newToken}`
              const retryRes = await fetch(targetUrl, { ...options, headers, signal: loopController.signal })
              if (retryRes.status === 401) {
                logout()
                window.location.hash = '/login'
                throw new ApiError('Unauthorized', 'unauthorized', 401)
              }
              if (retryRes.status === 204) return null as unknown as T
              const retryData = await retryRes.json()
              if (!options.keepMetadata && retryData && typeof retryData === 'object' && 'results' in retryData && Array.isArray(retryData.results)) {
                return retryData.results as T
              }
              return retryData as T
            }
            logout()
            window.location.hash = '/login'
            throw new ApiError('Unauthorized', 'unauthorized', 401)
          }

          if (!res.ok) {
            const errorData = (await res.json().catch(() => ({}))) as Record<string, unknown>
            let errMsg = (errorData.detail || errorData.error) as string | undefined
            if (!errMsg && typeof errorData === 'object' && errorData !== null) {
              const fieldErrors = Object.entries(errorData).map(([key, val]) => {
                const valStr = Array.isArray(val) ? val.join(', ') : String(val)
                return `${key}: ${valStr}`
              })
              if (fieldErrors.length > 0) {
                errMsg = fieldErrors.join('; ')
              }
            }
            const is4xx = res.status >= 400 && res.status < 500
            const errorType = is4xx ? (res.status === 401 ? 'unauthorized' : 'http_4xx') : 'http_5xx'
            lastError = new ApiError(errMsg || `Request failed with status ${res.status}`, errorType, res.status, errorData)

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

          if (res.status === 204) return null as unknown as T
          const data = await res.json()
          if (!options.keepMetadata && data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
            return data.results as T
          }
          return data as T
        } catch (error: unknown) {
          clearTimeout(timeoutId)
          options.signal?.removeEventListener('abort', onAbort)
          rapidAbortController.signal.removeEventListener('abort', onAbort)
          timeoutController.signal.removeEventListener('abort', onAbort)

          const err = error as { name?: string; message?: string }
          if (err?.name === 'AbortError') {
            const reason = loopController.signal.reason
            if (reason instanceof ApiError) {
              throw reason
            }
            throw new ApiError('Request aborted', 'aborted')
          }

          let apiErr: ApiError
          if (error instanceof ApiError) {
            apiErr = error
          } else {
            apiErr = new ApiError(err?.message || 'Network error', 'network')
          }

          lastError = apiErr

          if (apiErr.type === 'network' || apiErr.type === 'unauthorized' || apiErr.type === 'aborted' || apiErr.type === 'timeout') {
            throw apiErr
          }

          if (attempt === maxRetries - 1) {
            throw apiErr
          }

          const delayMs = Math.pow(2, attempt) * 1000
          await sleep(delayMs)
        } finally {
          clearTimeout(timeoutId)
          options.signal?.removeEventListener('abort', onAbort)
          rapidAbortController.signal.removeEventListener('abort', onAbort)
          timeoutController.signal.removeEventListener('abort', onAbort)
        }
      }

      throw lastError || new ApiError('Request failed after retries', 'unknown')
    } finally {
      if (cancelKey && activeRequestsRef.current.get(cancelKey) === rapidAbortController) {
        activeRequestsRef.current.delete(cancelKey)
      }
    }
  }, [logout, refreshAccessToken])

  return { request }
}

