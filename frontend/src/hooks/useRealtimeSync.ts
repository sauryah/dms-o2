import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useAuth } from '../contexts/AuthContext'
import { DIE_UPDATE_EVENT, SET_UPDATE_EVENT, MACHINE_UPDATE_EVENT, BACKUP_UPDATE_EVENT, RECOUNT_UPDATE_EVENT } from '../contracts/dieContracts'

const EVENT_QUERY_KEYS: Record<string, string[][]> = {
  [DIE_UPDATE_EVENT]: [['dies'], ['search'], ['stats']],
  [SET_UPDATE_EVENT]: [['sets'], ['machines']],
  [MACHINE_UPDATE_EVENT]: [['machines'], ['categories']],
  [BACKUP_UPDATE_EVENT]: [['backups']],
  [RECOUNT_UPDATE_EVENT]: [['machineDieStocks'], ['dieInventoryRecounts']],
}

export function useRealtimeSync(options: {
  onShowToast: (msg: string, type?: "info" | "success" | "error") => void
  onAddNotification: (title: string, msg: string, type?: "info" | "success" | "error") => void
  onAnnounce: (msg: string) => void
  onRebuildDetected?: () => void
}) {
  const { token } = useAuth()
  const { request } = useApi()
  const queryClient = useQueryClient()
  const recentEvents = useRef(new Set<string>())

  const invalidateRelevantQueries = useCallback((eventType: string) => {
    const keys = EVENT_QUERY_KEYS[eventType]
    if (keys) {
      keys.forEach(key => queryClient.invalidateQueries({ queryKey: key }))
    } else {
      queryClient.invalidateQueries()
    }
  }, [queryClient])

  useEffect(() => {
    if (!token) return

    let eventSource: EventSource | null = null
    let isCancelled = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let reconnectDelay = 1000
    let consecutiveFailures = 0
    const MAX_RECONNECT_ATTEMPTS = 5

    const scheduleReconnect = () => {
      if (!isCancelled && consecutiveFailures < MAX_RECONNECT_ATTEMPTS) {
        const baseDelay = Math.min(1000 * Math.pow(2, consecutiveFailures), 30000)
        const jitter = Math.random() * 1000
        const delay = baseDelay + jitter
        reconnectTimer = setTimeout(() => {
          connectSSE()
        }, delay)
      } else if (consecutiveFailures >= MAX_RECONNECT_ATTEMPTS) {
        console.warn('EventSource max reconnection attempts reached. Realtime updates suspended.')
      }
    }

    const connectSSE = async () => {
      if (consecutiveFailures >= MAX_RECONNECT_ATTEMPTS) return

      try {
        const res = await request('/api/auth/sse-ticket/', { method: 'POST' })
        if (isCancelled) return

        const ticket = res?.ticket
        if (!ticket) {
          consecutiveFailures++
          console.warn('Failed to get SSE ticket from response:', res)
          scheduleReconnect()
          return
        }

        eventSource = new EventSource(`/api/events/?ticket=${encodeURIComponent(ticket)}`)

        eventSource.onopen = () => {
          window.dispatchEvent(new CustomEvent('sse-status', { detail: { status: 'connected' } }))
        }

        eventSource.onmessage = (event) => {
          reconnectDelay = 1000
          consecutiveFailures = 0
          window.dispatchEvent(new CustomEvent('sse-status', { detail: { status: 'connected' } }))
          try {
            const payload = JSON.parse(event.data)

            const signature = `${payload.type}-${payload.data?.id || payload.data?.filename || ''}-${payload.data?.action || ''}`
            if (recentEvents.current.has(signature)) return
            recentEvents.current.add(signature)
            setTimeout(() => recentEvents.current.delete(signature), 3000)

            invalidateRelevantQueries(payload.type)

            if (payload.type === DIE_UPDATE_EVENT) {
              if (payload.data?.action === 'delete') {
                const msg = `Die ${payload.data.id} has been deleted.`
                options.onShowToast(msg, 'info')
                options.onAddNotification('Die Deleted', msg, 'info')
                options.onAnnounce(msg)
              } else if (payload.data?.action === 'bulk_import') {
                const msg = 'Bulk import of dies completed.'
                options.onShowToast(msg, 'success')
                options.onAddNotification('Bulk Import Completed', msg, 'success')
                options.onAnnounce(msg)
                options.onRebuildDetected?.()
              } else if (payload.data?.action === 'save') {
                request(`/api/dies/${payload.data.id}/`)
                  .then(die => {
                    if (die) {
                      const msg = `Die ${die.die_id} updated.`
                      options.onShowToast(msg, 'info')
                      options.onAddNotification('Die Updated', msg, 'info')
                      options.onAnnounce(msg)
                    }
                  })
                  .catch(err => console.error(err))
              }
            } else if (payload.type === SET_UPDATE_EVENT) {
              const msg = `Set ${payload.data?.id || ''} updated.`
              options.onShowToast(msg, 'info')
              options.onAddNotification('Set Updated', msg, 'info')
              options.onAnnounce(msg)
            } else if (payload.type === MACHINE_UPDATE_EVENT) {
              const msg = `Machine ${payload.data?.id || ''} updated.`
              options.onShowToast(msg, 'info')
              options.onAddNotification('Machine Updated', msg, 'info')
              options.onAnnounce(msg)
            } else if (payload.type === BACKUP_UPDATE_EVENT) {
              const action = payload.data?.action
              if (action === 'delete') {
                const msg = `Backup ${payload.data.filename} deleted.`
                options.onShowToast(msg, 'info')
                options.onAddNotification('Backup Deleted', msg, 'info')
                options.onAnnounce(msg)
              } else if (action === 'upload') {
                const msg = `Backup ${payload.data.filename} uploaded.`
                options.onShowToast(msg, 'success')
                options.onAddNotification('Backup Uploaded', msg, 'success')
                options.onAnnounce(msg)
              } else if (action === 'backup') {
                const msg = `Database backup "${payload.data?.filename || ''}" created successfully.`
                options.onShowToast(msg, 'success')
                options.onAddNotification('Backup Created', msg, 'success')
                options.onAnnounce(msg)
              } else if (action === 'restore') {
                const msg = `Database restore from "${payload.data?.filename || ''}" executed successfully.`
                options.onShowToast(msg, 'success')
                options.onAddNotification('System Restored', msg, 'success')
                options.onAnnounce(msg)
                options.onRebuildDetected?.()
              }
            } else if (payload.type === RECOUNT_UPDATE_EVENT) {
              const action = payload.data?.action
              if (action === 'submit') {
                const msg = 'Audit recount sheet submitted. Live stocks updated.'
                options.onShowToast(msg, 'success')
                options.onAddNotification('Stock Audited', msg, 'success')
                options.onAnnounce(msg)
              } else if (action === 'create') {
                const msg = 'New audit recount sheet created.'
                options.onShowToast(msg, 'info')
                options.onAddNotification('Audit Created', msg, 'info')
                options.onAnnounce(msg)
              } else if (action === 'save') {
                const msg = 'Audit recount sheet updated.'
                options.onShowToast(msg, 'info')
                options.onAddNotification('Audit Updated', msg, 'info')
                options.onAnnounce(msg)
              }
            }
          } catch (e) {
            console.error('Failed to parse event data:', e)
          }
        }

        eventSource.onerror = () => {
          consecutiveFailures++
          window.dispatchEvent(new CustomEvent('sse-status', { detail: { status: 'reconnecting' } }))
          if (consecutiveFailures === 1) {
            console.warn('EventSource connection lost. Retrying...')
          }
          if (eventSource) {
            eventSource.close()
            eventSource = null
          }
          scheduleReconnect()
        }
      } catch (e) {
        consecutiveFailures++
        window.dispatchEvent(new CustomEvent('sse-status', { detail: { status: 'disconnected' } }))
        console.warn('Failed to establish SSE ticket connection:', e)
        scheduleReconnect()
      }
    }

    connectSSE()

    return () => {
      isCancelled = true
      consecutiveFailures = MAX_RECONNECT_ATTEMPTS
      window.dispatchEvent(new CustomEvent('sse-status', { detail: { status: 'disconnected' } }))
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [token, request, invalidateRelevantQueries, options])
}
