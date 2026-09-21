import { useState, useEffect, useRef, useCallback } from 'react'

export interface MachineTelemetryData {
  speed_mpm: number
  tension_n: number
  lube_temp_c: number
  actual_dia_mm: number
  motor_power_kw: number
}

export interface MachineTelemetryEvent {
  type: 'MACHINE_TELEMETRY'
  machine_id: string
  timestamp: number
  telemetry: MachineTelemetryData
}

export interface TelemetryPoint extends MachineTelemetryData {
  timestamp: number
}

export interface MachineTelemetryState {
  latest: MachineTelemetryData | null
  history: TelemetryPoint[]
  lastSeen: number | null
  isStreaming: boolean
  machineId: string
}

const MAX_HISTORY_POINTS = 30
const STREAMING_TIMEOUT_MS = 3000

/**
 * Hook to ingest real-time machine telemetry broadcast from the C edge gateway via Go SSE.
 *
 * @param targetMachineId Optional machine ID filter (e.g. "EN-01"). If omitted, captures all machines.
 */
export function useMachineTelemetry(targetMachineId?: string) {
  const [telemetryMap, setTelemetryMap] = useState<Record<string, MachineTelemetryState>>({})
  const historyRef = useRef<Record<string, TelemetryPoint[]>>({})
  const lastSeenRef = useRef<Record<string, number>>({})

  const handleTelemetryEvent = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<MachineTelemetryEvent>
    const payload = customEvent.detail

    if (!payload || payload.type !== 'MACHINE_TELEMETRY' || !payload.machine_id) {
      return
    }

    if (targetMachineId && payload.machine_id !== targetMachineId) {
      return
    }

    const machineId = payload.machine_id
    const now = Date.now()
    const point: TelemetryPoint = {
      ...payload.telemetry,
      timestamp: payload.timestamp ? payload.timestamp * 1000 : now,
    }

    const prevHistory = historyRef.current[machineId] || []
    const updatedHistory = [...prevHistory.slice(-(MAX_HISTORY_POINTS - 1)), point]
    historyRef.current[machineId] = updatedHistory
    lastSeenRef.current[machineId] = now

    setTelemetryMap(prev => ({
      ...prev,
      [machineId]: {
        latest: payload.telemetry,
        history: updatedHistory,
        lastSeen: now,
        isStreaming: true,
        machineId,
      },
    }))
  }, [targetMachineId])

  useEffect(() => {
    window.addEventListener('machine-telemetry', handleTelemetryEvent)

    // Periodic heartbeat check to mark inactive streams as disconnected
    const heartbeatTimer = setInterval(() => {
      const now = Date.now()
      setTelemetryMap(prev => {
        let changed = false
        const next = { ...prev }

        for (const [id, state] of Object.entries(next)) {
          if (state.isStreaming && (!state.lastSeen || now - state.lastSeen > STREAMING_TIMEOUT_MS)) {
            next[id] = { ...state, isStreaming: false }
            changed = true
          }
        }

        return changed ? next : prev
      })
    }, 1000)

    return () => {
      window.removeEventListener('machine-telemetry', handleTelemetryEvent)
      clearInterval(heartbeatTimer)
    }
  }, [handleTelemetryEvent])

  const targetState: MachineTelemetryState = targetMachineId && telemetryMap[targetMachineId]
    ? telemetryMap[targetMachineId]
    : {
        latest: null,
        history: [],
        lastSeen: null,
        isStreaming: false,
        machineId: targetMachineId || '',
      }

  return {
    telemetryMap,
    targetState,
    isStreaming: targetState.isStreaming,
    latest: targetState.latest,
    history: targetState.history,
  }
}
