import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ClipboardPaste,
  Layers,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Copy,
  Package,
  Hourglass,
} from 'lucide-react'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Skeleton } from '../../../components/ui/Skeleton'
import { parseInventoryInput, parseSeriesInput } from '../domain/parsers'
import { useDieSetPlanner } from '../hooks/useDieSetPlanner'

const INVENTORY_PLACEHOLDER = `0.550    4
0.555    4
0.560    4
0.585    10
0.625    6

Paste size + quantity pairs, tab or space separated`

const SERIES_PLACEHOLDER = `0.620
0.625
0.625
0.630
0.635
0.635
0.640
0.640`

export function DieSetPlannerPage() {
  const [inventoryText, setInventoryText] = useState('')
  const [seriesText, setSeriesText] = useState('')
  const [showParseErrors, setShowParseErrors] = useState(false)
  const { result, loading, error, calculate, reset } = useDieSetPlanner()

  const inventoryParse = useMemo(() => parseInventoryInput(inventoryText), [inventoryText])
  const seriesParse = useMemo(() => parseSeriesInput(seriesText), [seriesText])

  const parseErrors = [...inventoryParse.errors, ...seriesParse.errors]
  const hasInput = inventoryText.trim() !== '' || seriesText.trim() !== ''
  const canCalculate = inventoryParse.rows.length > 0 && seriesParse.sizes.length > 0 && !loading

  const handleCalculate = async () => {
    setShowParseErrors(true)
    if (parseErrors.length > 0) return
    await calculate({
      inventory: inventoryParse.rows.map((r) => ({ die_size: r.dieSize, quantity: r.quantity })),
      series: seriesParse.sizes,
    })
  }

  const handleReset = () => {
    setInventoryText('')
    setSeriesText('')
    setShowParseErrors(false)
    reset()
  }

  const handleCopy = () => {
    if (!result) return
    const header = 'Die Size\tRequired/Set\tAvailable\tUsed\tRemaining\tBottleneck'
    const lines = result.requirements.map((r) =>
      [
        r.die_size,
        r.required_per_set,
        r.available,
        r.used,
        r.remaining,
        r.is_bottleneck ? 'YES' : '-',
      ].join('\t'),
    )
    const text = [
      `Maximum Complete Sets: ${result.maximum_sets} of ${result.total_dies_per_set} dies per set`,
      '',
      header,
      ...lines,
    ].join('\n')
    navigator.clipboard?.writeText(text).catch(() => undefined)
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[var(--color-bg)]">
      <PageHeader
        title="Die Set Planner"
        subtitle="Calculate how many complete die sets your current inventory can build"
        breadcrumbs={[
          { label: 'Tools', href: '/tools' },
          { label: 'Die Set Planner' },
        ]}
        actions={
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 space-y-8">
        {/* Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <InputCard
            icon="inventory"
            title="Current Inventory"
            description="Paste die size + quantity rows — supports tabs, spaces, spreadsheet cells, optional headers, and duplicate rows."
            value={inventoryText}
            onChange={(v) => {
              setInventoryText(v)
              setShowParseErrors(false)
            }}
            placeholder={INVENTORY_PLACEHOLDER}
            badge={
              inventoryParse.rows.length > 0
                ? `${inventoryParse.rows.length} die${inventoryParse.rows.length === 1 ? '' : 's'}`
                : undefined
            }
          />
          <InputCard
            icon="series"
            title="Die Series"
            badge={
              seriesParse.sizes.length > 0
                ? `${seriesParse.sizes.length} die${seriesParse.sizes.length === 1 ? '' : 's'}`
                : undefined
            }
            description="Paste every die size required for ONE set. Duplicates count as multiple dies per set."
            value={seriesText}
            onChange={(v) => {
              setSeriesText(v)
              setShowParseErrors(false)
            }}
            placeholder={SERIES_PLACEHOLDER}
          />
        </div>

        {/* Parse errors */}
        {showParseErrors && parseErrors.length > 0 && (
          <div className="bg-rose-500/5 border border-rose-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                Unable to calculate — check the input below
              </h4>
            </div>
            <ul className="space-y-1.5">
              {parseErrors.map((msg, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-rose-300/90">
                  <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  {msg}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Backend error */}
        {error && (
          <div className="bg-rose-500/5 border border-rose-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Calculation failed</h4>
            </div>
            <p className="text-xs text-rose-300/90">{error}</p>
          </div>
        )}

        {/* Calculate */}
        <div className="flex items-center justify-center">
          <button
            onClick={handleCalculate}
            disabled={!canCalculate}
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-bold shadow-lg shadow-blue-500/10 transition-colors"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4" />
                Calculate Sets
              </>
            )}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-16 text-center">
            <ClipboardPaste className="h-10 w-10 text-[var(--color-border)] mx-auto mb-4" />
            <h3 className="text-sm font-bold text-[var(--color-text)] mb-2">
              {hasInput ? 'Ready to calculate' : 'No Calculation Yet'}
            </h3>
            <p className="text-xs text-[var(--color-muted)] max-w-md mx-auto">
              Paste your current die inventory and a die series above, then press
              Calculate Sets. The planner finds how many complete sets you can build,
              pinpoints bottleneck dies, and shows what remains in inventory.
            </p>
          </div>
        )}

        {/* Results */}
        {result && !error && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Hero */}
            <div
              className={`rounded-2xl border p-8 text-center shadow-xl ${
                result.maximum_sets > 0
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : 'bg-rose-500/5 border-rose-500/30'
              }`}
            >
              <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-[var(--color-muted)] mb-2">
                Maximum Complete Sets
              </div>
              <div
                className={`text-6xl font-black font-heading ${
                  result.maximum_sets > 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {result.maximum_sets.toLocaleString()}
              </div>
              <div className="text-xs text-[var(--color-muted)] mt-3">
                {result.total_dies_per_set} dies required per set ·{' '}
                {result.requirements.length} unique die sizes
              </div>
            </div>

            {/* Warnings */}
            {result.warnings.map((msg) => (
              <div key={msg} className="bg-amber-500/5 border border-amber-500/25 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-300/90">{msg}</p>
              </div>
            ))}

            {/* Requirements table */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                  Per-Die Breakdown
                </h3>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  Copy Result
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="px-4 py-2.5 text-left font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">Die Size</th>
                      <th className="px-4 py-2.5 text-right font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">Req/Set</th>
                      <th className="px-4 py-2.5 text-right font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">Available</th>
                      <th className="px-4 py-2.5 text-right font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">Sets Possible</th>
                      <th className="px-4 py-2.5 text-right font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">Used</th>
                      <th className="px-4 py-2.5 text-right font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">Remaining</th>
                      <th className="px-4 py-2.5 text-right font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.requirements.map((r) => (
                      <tr
                        key={r.die_size}
                        className={`border-b border-[var(--color-border)]/50 transition-colors ${
                          r.is_bottleneck ? 'bg-rose-500/[0.04]' : r.is_missing ? 'bg-amber-500/[0.04]' : ''
                        }`}
                      >
                        <td className="px-4 py-2.5 font-mono font-bold text-[var(--color-text)]">{r.die_size}</td>
                        <td className="px-4 py-2.5 font-mono text-[var(--color-text)] text-right">{r.required_per_set}</td>
                        <td className="px-4 py-2.5 font-mono text-[var(--color-text)] text-right">{r.available}</td>
                        <td className="px-4 py-2.5 font-mono text-[var(--color-text)] text-right">{r.possible_sets}</td>
                        <td className="px-4 py-2.5 font-mono text-[var(--color-text)] text-right">{r.used}</td>
                        <td className="px-4 py-2.5 font-mono text-[var(--color-text)] text-right">{r.remaining}</td>
                        <td className="px-4 py-2.5 text-right">
                          {r.is_missing ? (
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-400">
                              <XCircle className="h-3 w-3" /> missing
                            </span>
                          ) : r.is_bottleneck ? (
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-rose-400">
                              <AlertTriangle className="h-3 w-3" /> bottleneck
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" /> ok
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottleneck dies */}
            {result.bottlenecks.length > 0 && (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                    Bottleneck Dies
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.bottlenecks.map((b) => (
                    <span
                      key={b.die_size}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 font-mono text-xs font-bold"
                    >
                      {b.die_size}
                      <span className="text-rose-400/70 font-normal ml-1.5">
                        {b.possible_sets} set{b.possible_sets === 1 ? '' : 's'}
                      </span>
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--color-muted)] mt-3 leading-relaxed">
                  These dies are the limiting factor — any of them stocked up first raises the
                  total number of complete sets you can build.
                </p>
              </div>
            )}

            {/* Missing + unused */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {result.missing_dies.length > 0 && (
                <div className="bg-[var(--color-surface)] border border-amber-500/25 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Hourglass className="h-4 w-4 text-amber-400" />
                    <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                      Missing Dies
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {result.missing_dies.map((m) => (
                      <li key={m.die_size} className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-amber-300">{m.die_size}</span>
                        <span className="text-[var(--color-muted)]">
                          requires {m.quantity} per set · available 0
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.unused_inventory.length > 0 && (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-blue-400" />
                    <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                      Unused Inventory
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {result.unused_inventory.map((u) => (
                      <li key={u.die_size} className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-[var(--color-text)]">{u.die_size}</span>
                        <span className="text-[var(--color-muted)]">× {u.quantity}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-[var(--color-muted)] mt-3 leading-relaxed">
                    Not required by this series — left untouched.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

function InputCard({
  title,
  description,
  value,
  onChange,
  placeholder,
  badge,
  icon,
}: {
  title: string
  description: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  badge?: string
  icon: 'inventory' | 'series'
}) {
  const Icon = icon === 'inventory' ? Layers : icon === 'series' ? Layers : Package
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-blue-400" />
          <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
            {title}
          </h3>
        </div>
        {badge && (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-blue-500/10 border border-blue-500/25 text-blue-300">
            {badge}
          </span>
        )}
      </div>
      <p className="text-[11px] text-[var(--color-muted)] mb-3">{description}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="w-full h-48 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-[var(--color-text)] font-mono text-xs leading-relaxed focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-colors resize-y placeholder:text-slate-600"
      />
    </div>
  )
}