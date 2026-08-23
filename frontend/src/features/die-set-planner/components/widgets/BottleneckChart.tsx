import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { DieSetResult } from '../../types'

interface BottleneckChartProps {
  result: DieSetResult
}

export function BottleneckChart({ result }: BottleneckChartProps) {
  const chartData = useMemo(() => {
    if (!result || !Array.isArray(result.requirements)) return []

    // Determine target amount
    const targetSets =
      result.target_sets !== undefined && result.target_sets !== null
        ? result.target_sets
        : result.maximum_sets + 1

    // Filter to show bottleneck sizes, missing sizes, or procurement items
    const items = result.requirements
      .filter((req) => {
        const isBottleneck = req.possible_sets === result.maximum_sets
        const isMissing = req.available < req.required_per_set
        const isProcure = result.procurement?.some((p) => p.die_size === req.die_size)
        return isBottleneck || isMissing || isProcure
      })
      .slice(0, 10) // Top 10 constrained sizes
      .map((req) => {
        const requiredQty = req.required_per_set * targetSets
        return {
          size: `${req.die_size} mm`,
          Available: req.available,
          Required: requiredQty,
        }
      })
    return items
  }, [result])

  if (chartData.length === 0) return null

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 select-none space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
              Bottleneck & Deficit Analytics
            </h3>
            <p className="text-[11px] text-[var(--color-muted)]">
              Stock availability comparison against requirements to assemble target or next complete set.
            </p>
          </div>
        </div>
      </div>

      <div className="h-64 w-full text-xs font-mono pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
            <XAxis dataKey="size" stroke="var(--color-muted)" tickLine={false} />
            <YAxis stroke="var(--color-muted)" tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                borderRadius: '12px',
                color: 'var(--color-text)',
                fontFamily: 'monospace',
                fontSize: '11px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}
            />
            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="Available" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="Required" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
