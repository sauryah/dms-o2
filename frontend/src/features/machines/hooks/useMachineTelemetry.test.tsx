import React from 'react'
import { render, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useMachineTelemetry, MachineTelemetryEvent } from './useMachineTelemetry'

function TelemetryProbe({
  targetMachineId,
  onUpdate,
}: {
  targetMachineId?: string
  onUpdate: (data: ReturnType<typeof useMachineTelemetry>) => void
}) {
  const telemetry = useMachineTelemetry(targetMachineId)
  React.useEffect(() => {
    onUpdate(telemetry)
  }, [telemetry, onUpdate])
  return null
}

describe('useMachineTelemetry Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in disconnected state when no telemetry has arrived', () => {
    let currentData: ReturnType<typeof useMachineTelemetry> | null = null

    render(
      <TelemetryProbe
        targetMachineId="EN-01"
        onUpdate={(data) => {
          currentData = data
        }}
      />
    )

    expect(currentData).not.toBeNull()
    expect(currentData!.isStreaming).toBe(false)
    expect(currentData!.latest).toBeNull()
    expect(currentData!.history).toEqual([])
  })

  it('ingests live telemetry packets for target machine', () => {
    let currentData: ReturnType<typeof useMachineTelemetry> | null = null

    render(
      <TelemetryProbe
        targetMachineId="EN-01"
        onUpdate={(data) => {
          currentData = data
        }}
      />
    )

    const packet1: MachineTelemetryEvent = {
      type: 'MACHINE_TELEMETRY',
      machine_id: 'EN-01',
      timestamp: 1726900001,
      telemetry: {
        speed_mpm: 850.5,
        tension_n: 142.0,
        lube_temp_c: 48.5,
        actual_dia_mm: 0.6202,
        motor_power_kw: 28.5,
      },
    }

    act(() => {
      window.dispatchEvent(new CustomEvent('machine-telemetry', { detail: packet1 }))
    })

    expect(currentData!.isStreaming).toBe(true)
    expect(currentData!.latest).toEqual(packet1.telemetry)
    expect(currentData!.history.length).toBe(1)
    expect(currentData!.history[0].speed_mpm).toBe(850.5)

    const packet2: MachineTelemetryEvent = {
      type: 'MACHINE_TELEMETRY',
      machine_id: 'EN-01',
      timestamp: 1726900002,
      telemetry: {
        speed_mpm: 855.0,
        tension_n: 141.2,
        lube_temp_c: 49.0,
        actual_dia_mm: 0.6200,
        motor_power_kw: 29.1,
      },
    }

    act(() => {
      window.dispatchEvent(new CustomEvent('machine-telemetry', { detail: packet2 }))
    })

    expect(currentData!.isStreaming).toBe(true)
    expect(currentData!.latest?.speed_mpm).toBe(855.0)
    expect(currentData!.history.length).toBe(2)
  })

  it('ignores telemetry for different machines when targetMachineId is set', () => {
    let currentData: ReturnType<typeof useMachineTelemetry> | null = null

    render(
      <TelemetryProbe
        targetMachineId="EN-01"
        onUpdate={(data) => {
          currentData = data
        }}
      />
    )

    const packetForOther: MachineTelemetryEvent = {
      type: 'MACHINE_TELEMETRY',
      machine_id: 'EN-02',
      timestamp: 1726900001,
      telemetry: {
        speed_mpm: 400.0,
        tension_n: 95.0,
        lube_temp_c: 42.0,
        actual_dia_mm: 1.200,
        motor_power_kw: 15.0,
      },
    }

    act(() => {
      window.dispatchEvent(new CustomEvent('machine-telemetry', { detail: packetForOther }))
    })

    expect(currentData!.isStreaming).toBe(false)
    expect(currentData!.latest).toBeNull()
    expect(currentData!.history.length).toBe(0)
  })

  it('transitions to disconnected when no heartbeat arrives within timeout', () => {
    let currentData: ReturnType<typeof useMachineTelemetry> | null = null

    render(
      <TelemetryProbe
        targetMachineId="EN-01"
        onUpdate={(data) => {
          currentData = data
        }}
      />
    )

    const packet: MachineTelemetryEvent = {
      type: 'MACHINE_TELEMETRY',
      machine_id: 'EN-01',
      timestamp: Math.floor(Date.now() / 1000),
      telemetry: {
        speed_mpm: 850.0,
        tension_n: 140.0,
        lube_temp_c: 48.0,
        actual_dia_mm: 0.62,
        motor_power_kw: 28.0,
      },
    }

    act(() => {
      window.dispatchEvent(new CustomEvent('machine-telemetry', { detail: packet }))
    })

    expect(currentData!.isStreaming).toBe(true)

    // Advance timers past STREAMING_TIMEOUT_MS (3000ms) + interval (1000ms)
    act(() => {
      vi.advanceTimersByTime(4500)
    })

    expect(currentData!.isStreaming).toBe(false)
  })
})
