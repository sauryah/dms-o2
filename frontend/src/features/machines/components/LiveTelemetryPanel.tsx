import { useState } from 'react'
import { Activity, Gauge, Zap, Thermometer, Disc, Radio, AlertCircle } from 'lucide-react'
import { useMachineTelemetry } from '../hooks/useMachineTelemetry'
import { Machine } from '../../../types'

interface LiveTelemetryPanelProps {
  machines?: Machine[]
}

export function LiveTelemetryPanel({ machines }: LiveTelemetryPanelProps) {
  const machineList = machines && machines.length > 0
    ? machines.map(m => m.name)
    : ['EN-01', 'EN-02', 'EN-03']

  const [selectedMachine, setSelectedMachine] = useState<string>(machineList[0] || 'EN-01')
  const { targetState, isStreaming, latest, history } = useMachineTelemetry(selectedMachine)

  // Sparkline helper
  const renderSparkline = (dataKey: keyof typeof latest, strokeColor: string) => {
    if (!history || history.length < 2) {
      return (
        <div className="h-8 flex items-center justify-center text-[10px] text-[var(--color-muted)] italic">
          Awaiting telemetry samples...
        </div>
      )
    }

    const values = history.map(p => Number(p[dataKey]) || 0)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min === 0 ? 1 : max - min

    const points = values
      .map((val, idx) => {
        const x = (idx / (values.length - 1)) * 100
        const y = 28 - ((val - min) / range) * 24
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')

    return (
      <svg className="w-full h-8 overflow-visible" viewBox="0 0 100 32" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    )
  }

  return (
    <div className="lg:col-span-3 space-y-6 font-mono">
      {/* Top Controller Bar */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Radio className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                Edge Gateway Live Telemetry
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isStreaming
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isStreaming ? 'bg-emerald-400 animate-ping' : 'bg-zinc-500'
                  }`}
                />
                {isStreaming ? 'LIVE STREAMING' : 'OFFLINE'}
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
              Sub-second Modbus TCP telemetry streamed from C Edge Gateway via Redis Pub/Sub & Go SSE
            </p>
          </div>
        </div>

        {/* Machine Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label htmlFor="telemetry-machine-select" className="text-xs text-[var(--color-muted)] uppercase font-bold">
            Machine:
          </label>
          <select
            id="telemetry-machine-select"
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-blue-500 uppercase font-mono cursor-pointer font-bold"
          >
            {machineList.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Line Speed */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-[var(--color-muted)] font-bold uppercase tracking-wider">
              Drawing Speed
            </span>
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-[var(--color-text)] font-mono tabular-nums">
              {latest ? latest.speed_mpm.toFixed(1) : '--.-'}
              <span className="text-xs text-[var(--color-muted)] ml-1 font-normal">m/min</span>
            </div>
            <div className="mt-2">{renderSparkline('speed_mpm', '#22d3ee')}</div>
          </div>
          <div className="text-[10px] text-[var(--color-muted)]">Target: ~850 m/min</div>
        </div>

        {/* Metric 2: Drawing Tension */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-[var(--color-muted)] font-bold uppercase tracking-wider">
              Capstan Tension
            </span>
            <Gauge className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-[var(--color-text)] font-mono tabular-nums">
              {latest ? latest.tension_n.toFixed(1) : '--.-'}
              <span className="text-xs text-[var(--color-muted)] ml-1 font-normal">N</span>
            </div>
            <div className="mt-2">{renderSparkline('tension_n', '#34d399')}</div>
          </div>
          <div className="text-[10px] text-[var(--color-muted)]">Nominal: 130 - 150 N</div>
        </div>

        {/* Metric 3: Lubricant Temp */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-[var(--color-muted)] font-bold uppercase tracking-wider">
              Die Sump Temp
            </span>
            <Thermometer className="h-4 w-4 text-amber-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-[var(--color-text)] font-mono tabular-nums">
              {latest ? latest.lube_temp_c.toFixed(1) : '--.-'}
              <span className="text-xs text-[var(--color-muted)] ml-1 font-normal">°C</span>
            </div>
            <div className="mt-2">{renderSparkline('lube_temp_c', '#fbbf24')}</div>
          </div>
          <div className="text-[10px] text-[var(--color-muted)]">Threshold: &lt; 55 °C</div>
        </div>

        {/* Metric 4: Wire Diameter */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-[var(--color-muted)] font-bold uppercase tracking-wider">
              Laser Diameter
            </span>
            <Disc className="h-4 w-4 text-purple-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-[var(--color-text)] font-mono tabular-nums">
              {latest ? latest.actual_dia_mm.toFixed(4) : '-.----'}
              <span className="text-xs text-[var(--color-muted)] ml-1 font-normal">mm</span>
            </div>
            <div className="mt-2">{renderSparkline('actual_dia_mm', '#c084fc')}</div>
          </div>
          <div className="text-[10px] text-[var(--color-muted)]">Tolerance: ±0.003 mm</div>
        </div>

        {/* Metric 5: Motor Power */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-[var(--color-muted)] font-bold uppercase tracking-wider">
              Motor Power
            </span>
            <Zap className="h-4 w-4 text-rose-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-[var(--color-text)] font-mono tabular-nums">
              {latest ? latest.motor_power_kw.toFixed(1) : '--.-'}
              <span className="text-xs text-[var(--color-muted)] ml-1 font-normal">kW</span>
            </div>
            <div className="mt-2">{renderSparkline('motor_power_kw', '#fb7185')}</div>
          </div>
          <div className="text-[10px] text-[var(--color-muted)]">Peak Load: 45 kW</div>
        </div>
      </div>

      {/* Diagnostics / Connection Detail Card */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-bold">
            Architecture Pipeline
          </span>
          <div className="text-xs text-[var(--color-text)] flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20 font-bold">
              PLC (Modbus TCP :1502)
            </span>
            <span>&rarr;</span>
            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-md border border-purple-500/20 font-bold">
              C Edge Gateway
            </span>
            <span>&rarr;</span>
            <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded-md border border-rose-500/20 font-bold">
              Redis Pub/Sub
            </span>
            <span>&rarr;</span>
            <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-md border border-cyan-500/20 font-bold">
              Go SSE Listener
            </span>
            <span>&rarr;</span>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20 font-bold">
              React UI
            </span>
          </div>
        </div>

        <div className="text-right flex items-center gap-2">
          {!isStreaming && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Edge Gateway daemon offline</span>
            </div>
          )}
          {isStreaming && targetState.lastSeen && (
            <span className="text-[10px] text-emerald-400">
              Last packet: {new Date(targetState.lastSeen).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
