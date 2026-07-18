import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useApi } from './useApi'
import { useAuth } from '../contexts/AuthContext'
import { DIE_UPDATE_EVENT, SET_UPDATE_EVENT, MACHINE_UPDATE_EVENT, BACKUP_UPDATE_EVENT } from '../contracts/dieContracts'

const EVENT_QUERY_KEYS: Record<string, string[][]> = {
  [DIE_UPDATE_EVENT]: [['dies'], ['search'], ['stats']],
  [SET_UPDATE_EVENT]: [['sets'], ['machines']],
  [MACHINE_UPDATE_EVENT]: [['machines'], ['categories']],
  [BACKUP_UPDATE_EVENT]: [['backups']],
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

    const connectSSE = async () => {
      if (consecutiveFailures >= MAX_RECONNECT_ATTEMPTS) return

      try {
        const res = await request('/api/auth/sse-ticket/', { method: 'POST' })
        if (isCancelled) return

        const ticket = res.ticket
        if (!ticket) {
          console.error('Failed to get SSE ticket from response:', res)
          return
        }

        eventSource = new EventSource(`/api/events/?ticket=${encodeURIComponent(ticket)}`)

        eventSource.onmessage = (event) => {
          reconnectDelay = 1000
          consecutiveFailures = 0
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
                    let locationMsg = ''
                    if (die.set_name) {
                      locationMsg = ` on Set ${die.set_name} (${die.machine_name || 'no machine'})`
                    } else if (die.location) {
                      locationMsg = ` in ${die.location}`
                    }
                    const msg = `Die ${die.die_id} is now ${die.status}${locationMsg}.`
                    options.onShowToast(msg, 'info')
                    options.onAddNotification('Die Updated', msg, 'info')
                    options.onAnnounce(msg)
                  })
                  .catch(() => {
                    const msg = `Die ${payload.data.id} was updated.`
                    options.onShowToast(msg, 'info')
                    options.onAddNotification('Die Updated', msg, 'info')
                    options.onAnnounce(msg)
                  })
              }
            } else if (payload.type === SET_UPDATE_EVENT) {
              const msg = 'Die sets have been updated.'
              options.onShowToast(msg, 'info')
              options.onAddNotification('Die Sets Updated', msg, 'info')
              options.onAnnounce(msg)
            } else if (payload.type === MACHINE_UPDATE_EVENT) {
              const msg = 'Machine configurations have been updated.'
              options.onShowToast(msg, 'info')
              options.onAddNotification('Machines Updated', msg, 'info')
              options.onAnnounce(msg)
            } else if (payload.type === BACKUP_UPDATE_EVENT) {
              const action = payload.data?.action
              const filename = payload.data?.filename || ''
              if (action === 'backup') {
                const msg = `Database backup "${filename}" created successfully.`
                options.onShowToast(msg, 'success')
                options.onAddNotification('Backup Created', msg, 'success')
                options.onAnnounce(msg)
              } else if (action === 'restore') {
                const msg = `Database restore from "${filename}" executed successfully.`
                options.onShowToast(msg, 'success')
                options.onAddNotification('System Restored', msg, 'success')
                options.onAnnounce(msg)
                options.onRebuildDetected?.()
              } else if (action === 'delete') {
                const msg = `Backup "${filename}" deleted.`
                options.onShowToast(msg, 'info')
                options.onAddNotification('Backup Deleted', msg, 'info')
                options.onAnnounce(msg)
              } else if (action === 'upload') {
                const msg = `Backup "${filename}" uploaded successfully.`
                options.onShowToast(msg, 'success')
                options.onAddNotification('Backup Uploaded', msg, 'success')
                options.onAnnounce(msg)
              }
            }
          } catch (e) {
            console.error('Failed to parse event data:', e)
          }
        }

        eventSource.onerror = (err) => {
          consecutiveFailures++
          console.error('EventSource connection error:', err)
          if (eventSource) {
            eventSource.close()
            eventSource = null
          }
          if (!isCancelled && consecutiveFailures < MAX_RECONNECT_ATTEMPTS) {
            reconnectTimer = setTimeout(() => {
              reconnectDelay = Math.min(reconnectDelay * 2, 30000)
              connectSSE()
            }, reconnectDelay)
          }
        }
      } catch (e) {
        console.error('Failed to establish SSE ticket connection:', e)
      }
    }

    connectSSE()

    return () => {
      isCancelled = true
      consecutiveFailures = MAX_RECONNECT_ATTEMPTS
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [token, request, invalidateRelevantQueries, options])
}
