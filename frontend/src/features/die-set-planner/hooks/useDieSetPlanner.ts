import { useState, useCallback } from 'react'
import { useApi } from '../../../hooks/useApi'
import type { DieSetResult, DieSetCalculateRequest } from '../types'

export function useDieSetPlanner() {
  const { request } = useApi()
  const [result, setResult] = useState<DieSetResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const calculate = useCallback(
    async (payload: DieSetCalculateRequest) => {
      setLoading(true)
      setError(null)
      try {
        const res = await request('/api/go/tools/calculate/die-set', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        })
        if (res) setResult(res as DieSetResult)
      } catch (err: unknown) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'Unable to calculate the series. Please check your input and try again.'
        setError(message)
        setResult(null)
      } finally {
        setLoading(false)
      }
    },
    [request],
  )

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { result, loading, error, calculate, reset }
}