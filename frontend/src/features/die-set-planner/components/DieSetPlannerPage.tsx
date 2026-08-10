import { useMemo, useState, useCallback } from 'react'
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
  ShoppingCart,
  Target,
  Database,
  FileSpreadsheet,
  Download,
  Search,
  Sparkles,
} from 'lucide-react'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Skeleton } from '../../../components/ui/Skeleton'
import { parseInventoryInput, parseSeriesInput, normalizeDieSize, formatDieSize } from '../domain/parsers'
import { useDieSetPlanner } from '../hooks/useDieSetPlanner'
import { useApi } from '../../../hooks/useApi'
import { isDieActive } from '../../../utils/dieHelpers'

const SAMPLE_INVENTORY = `0.550    4
0.555    4
0.560    4
0.585   10
0.620    8
0.625    6
0.630    4
0.635    4
0.640    2`

const SAMPLE_SERIES = `0.620
0.625
0.625
0.630
0.635
0.635
0.640
0.640`

const INVENTORY_PLACEHOLDER = `0.550    4
0.555    4
0.560    4
0.585    10
0.625    6

Paste size + quantity pairs, tab or space separated (e.g. from Excel)`

const SERIES_PLACEHOLDER = `0.620
0.625
0.625
0.630
0.635
0.635
0.640
0.640`

type FilterStatus = 'all' | 'bottleneck' | 'missing' | 'ok'

export function DieSetPlannerPage() {
  const [inventoryText, setInventoryText] = useState('')
  const [seriesText, setSeriesText] = useState('')
  const [targetSets, setTargetSets] = useState('')
  const [targetError, setTargetError] = useState<string | null>(null)
  const [showParseErrors, setShowParseErrors] = useState(false)
  const [tableFilter, setTableFilter] = useState<FilterStatus>('all')
  const [tableSearch, setTableSearch] = useState('')
  const [loadingActiveStock, setLoadingActiveStock] = useState(false)
  const [activeStockNotice, setActiveStockNotice] = useState<string | null>(null)

  const { result, loading, error, calculate, reset } = useDieSetPlanner()
  const { request } = useApi()

  const inventoryParse = useMemo(() => parseInventoryInput(inventoryText), [inventoryText])
  const seriesParse = useMemo(() => parseSeriesInput(seriesText), [seriesText])

  const parseErrors = useMemo(() => {
    return [
      ...inventoryParse.errors,
      ...seriesParse.errors,
      ...(targetError ? [targetError] : []),
    ]
  }, [inventoryParse.errors, seriesParse.errors, targetError])

  const hasInput = inventoryText.trim() !== '' || seriesText.trim() !== ''
  const canCalculate = inventoryText.trim() !== '' && seriesText.trim() !== '' && !loading

  const handleCalculate = async () => {
    setShowParseErrors(true)
    setTargetError(null)
    if (inventoryText.trim() === '' || seriesText.trim() === '') return

    const parsedTarget = targetSets.trim() === '' ? undefined : Number(targetSets)
    if (parsedTarget !== undefined) {
      if (!Number.isInteger(parsedTarget) || parsedTarget < 0) {
        setTargetError('Target sets must be a positive whole number.')
        return
      }
      if (parsedTarget > 1000000000) {
        setTargetError('Target sets cannot exceed 1,000,000,000.')
        return
      }
    }

    await calculate({
      inventory_text: inventoryText,
      series_text: seriesText,
      ...(parsedTarget !== undefined && parsedTarget > 0 ? { target_sets: parsedTarget } : {}),
    })
  }

  const handleReset = () => {
    setInventoryText('')
    setSeriesText('')
    setTargetSets('')
    setTargetError(null)
    setShowParseErrors(false)
    setActiveStockNotice(null)
    setTableFilter('all')
    setTableSearch('')
    reset()
  }

  const handleLoadSample = () => {
    setInventoryText(SAMPLE_INVENTORY)
    setSeriesText(SAMPLE_SERIES)
    setTargetSets('5')
    setTargetError(null)
    setShowParseErrors(false)
    setActiveStockNotice('Loaded sample inventory & series for testing.')
  }

  const handleLoadActiveStock = useCallback(async () => {
    setLoadingActiveStock(true)
    setActiveStockNotice(null)
    try {
      const res = (await request('/api/go/search?limit=5000')) as {
        results?: Array<{ current_size?: string | null; status?: string }>
      }
      if (res && Array.isArray(res.results)) {
        const counts = new Map<number, number>()
        let totalCount = 0

        for (const die of res.results) {
          if (!die.current_size || !isDieActive(die)) continue
          const { hundredThousands } = normalizeDieSize(die.current_size)
          if (hundredThousands !== null) {
            counts.set(hundredThousands, (counts.get(hundredThousands) || 0) + 1)
            totalCount++
          }
        }

        if (counts.size === 0) {
          setActiveStockNotice('No active dies with sizes found in DMS database.')
        } else {
          const sortedKeys = Array.from(counts.keys()).sort((a, b) => a - b)
          const formattedRows = sortedKeys.map((key) => `${formatDieSize(key)}\t${counts.get(key)}`)
          setInventoryText(formattedRows.join('\n'))
          setActiveStockNotice(
            `Loaded ${totalCount} active dies across ${counts.size} unique sizes from DMS stock.`,
          )
        }
      } else {
        setActiveStockNotice('Unable to retrieve inventory stock records.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching active inventory stock'
      setActiveStockNotice(`Failed to load DMS stock: ${msg}`)
    } finally {
      setLoadingActiveStock(false)
    }
  }, [request])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (canCalculate) {
        handleCalculate()
      }
    }
  }

  const handleTargetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (canCalculate) {
        handleCalculate()
      }
    }
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
    const procurementSection =
      result.procurement && result.procurement.length > 0
        ? [
            '',
            `Procurement for ${result.target_sets} sets:`,
            ...result.procurement.map((p) => `\t${p.die_size}\t${p.procure}`),
          ]
        : []
    const text = [
      `Maximum Complete Sets: ${result.maximum_sets} of ${result.total_dies_per_set} dies per set`,
      '',
      header,
      ...lines,
      ...procurementSection,
    ].join('\n')
    navigator.clipboard?.writeText(text).catch(() => undefined)
  }

  const handleDownloadCSV = () => {
    if (!result) return
    const csvLines: string[] = []
    csvLines.push('DIE SET PLANNER REPORT')
    csvLines.push(`Maximum Complete Sets,${result.maximum_sets}`)
    csvLines.push(`Dies Required Per Set,${result.total_dies_per_set}`)
    csvLines.push(`Unique Die Sizes,${result.requirements.length}`)
    if (result.target_sets) csvLines.push(`Target Sets Requested,${result.target_sets}`)
    csvLines.push('')
    csvLines.push('Die Size,Required Per Set,Available,Sets Possible,Used,Remaining,Status')

    result.requirements.forEach((r) => {
      const status = r.is_missing ? 'MISSING' : r.is_bottleneck ? 'BOTTLENECK' : 'OK'
      csvLines.push(
        `"${r.die_size}",${r.required_per_set},${r.available},${r.possible_sets},${r.used},${r.remaining},${status}`,
      )
    })

    if (result.procurement && result.procurement.length > 0) {
      csvLines.push('')
      csvLines.push('PROCUREMENT PLAN')
      csvLines.push('Die Size,Required Per Set,Needed for Target,In Stock,Procure Shortfall')
      result.procurement.forEach((p) => {
        csvLines.push(`"${p.die_size}",${p.required_per_set},${p.target_need},${p.available},${p.procure}`)
      })
    }

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `die-set-planner-report-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredRequirements = useMemo(() => {
    if (!result) return []
    return result.requirements.filter((r) => {
      if (tableFilter === 'bottleneck' && !r.is_bottleneck) return false
      if (tableFilter === 'missing' && !r.is_missing) return false
      if (tableFilter === 'ok' && (r.is_bottleneck || r.is_missing)) return false
      if (tableSearch.trim() !== '' && !r.die_size.toLowerCase().includes(tableSearch.trim().toLowerCase())) {
        return false
      }
      return true
    })
  }, [result, tableFilter, tableSearch])

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
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadActiveStock}
              disabled={loadingActiveStock}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600/10 border border-blue-500/30 text-blue-300 hover:bg-blue-600/20 transition-colors disabled:opacity-50"
              title="Pull current active die inventory directly from DMS database"
            >
              <Database className="h-3.5 w-3.5" />
              {loadingActiveStock ? 'Loading Stock...' : 'Load Active Stock'}
            </button>
            <button
              onClick={handleLoadSample}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
              title="Populate sample inventory and series data"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Sample Data
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 space-y-8">
        {/* Active stock load feedback */}
        {activeStockNotice && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3.5 flex items-center justify-between text-xs text-blue-300">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 shrink-0 text-blue-400" />
              <span>{activeStockNotice}</span>
            </div>
            <button
              onClick={() => setActiveStockNotice(null)}
              className="text-blue-400/70 hover:text-blue-200 font-bold ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <InputCard
            id="inventory-input"
            icon="inventory"
            title="Current Inventory"
            description="Paste die size + quantity rows — supports tabs, spaces, Excel cells, units (mm/in), comma decimals, and duplicate rows."
            value={inventoryText}
            onChange={(v) => {
              setInventoryText(v)
              setShowParseErrors(false)
            }}
            onKeyDown={handleKeyDown}
            placeholder={INVENTORY_PLACEHOLDER}
            badge={
              inventoryParse.rows.length > 0
                ? `${inventoryParse.rows.length} die size${inventoryParse.rows.length === 1 ? '' : 's'}`
                : undefined
            }
          />
          <InputCard
            id="series-input"
            icon="series"
            title="Die Series"
            badge={
              seriesParse.sizes.length > 0
                ? `${seriesParse.sizes.length} die${seriesParse.sizes.length === 1 ? '' : 's'} per set`
                : undefined
            }
            description="Paste every die size required for ONE set. Duplicates count as multiple dies per set."
            value={seriesText}
            onChange={(v) => {
              setSeriesText(v)
              setShowParseErrors(false)
            }}
            onKeyDown={handleKeyDown}
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

        {/* Target sets + Calculate */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3">
            <Target className="h-4 w-4 text-blue-400" />
            <label className="text-xs text-[var(--color-muted)] font-semibold" htmlFor="target-sets">
              Target sets (optional)
            </label>
            <input
              id="target-sets"
              type="number"
              min={0}
              max={1000000000}
              step={1}
              value={targetSets}
              onChange={(e) => setTargetSets(e.target.value)}
              onKeyDown={handleTargetKeyDown}
              placeholder="e.g. 10"
              className="w-24 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[var(--color-text)] font-mono text-xs text-center focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-colors"
            />
            <span className="text-[10px] text-[var(--color-muted)]">
              Procurement plan returned when target exceeds current capacity
            </span>
          </div>
          <div className="flex items-center gap-3">
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
          <span className="text-[10px] text-[var(--color-muted)] font-mono">
            Tip: Press Ctrl+Enter in any text box to calculate immediately
          </span>
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
            <p className="text-xs text-[var(--color-muted)] max-w-md mx-auto leading-relaxed mb-6">
              Paste your current die inventory and a die series above, or click{' '}
              <span className="text-blue-400 font-semibold">Load Active Stock</span> to load directly from DMS database.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleLoadSample}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600/10 border border-blue-500/30 text-blue-300 hover:bg-blue-600/20 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Try Sample Calculation
              </button>
            </div>
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
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[var(--color-muted)] mt-4">
                <span>
                  <strong>{result.total_dies_per_set}</strong> dies required per set
                </span>
                <span>·</span>
                <span>
                  <strong>{result.requirements.length}</strong> unique die sizes
                </span>
                <span>·</span>
                <span>
                  <strong className="text-rose-400">{result.bottlenecks.length}</strong> bottleneck sizes
                </span>
                {result.missing_dies.length > 0 && (
                  <>
                    <span>·</span>
                    <span>
                      <strong className="text-amber-400">{result.missing_dies.length}</strong> missing sizes
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Warnings */}
            {result.warnings.map((msg) => (
              <div key={msg} className="bg-amber-500/5 border border-amber-500/25 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-300/90 leading-relaxed">{msg}</p>
              </div>
            ))}

            {/* Capacity Explanation and Target Assessment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Capacity Explanation Card */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-blue-400" />
                    <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                      Capacity Explanation
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed mb-4">
                    {result.maximum_sets === 0 ? (
                      <>
                        Production is blocked (<strong>0 sets</strong>) because you are missing{' '}
                        <strong className="text-rose-400">{result.missing_dies.length}</strong> required die sizes. 
                        Assemble or procure these sizes to enable set assembly.
                      </>
                    ) : (
                      <>
                        Your production limit of <strong>{result.maximum_sets}</strong> complete{' '}
                        {result.maximum_sets === 1 ? 'set' : 'sets'} is determined by your{' '}
                        <strong className="text-rose-400">{result.bottlenecks.length}</strong> bottleneck{' '}
                        {result.bottlenecks.length === 1 ? 'size' : 'sizes'}. Stocking more of these sizes will directly increase capacity.
                      </>
                    )}
                  </p>
                </div>
                
                {result.bottlenecks.length > 0 && (
                  <div className="bg-[var(--color-bg)] rounded-lg p-3.5 border border-[var(--color-border)] space-y-2">
                    <div className="text-[10px] uppercase font-mono font-bold text-[var(--color-muted)]">
                      Primary Constraints:
                    </div>
                    <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                      {result.bottlenecks.map((b) => (
                        <div key={b.die_size} className="flex items-center justify-between text-xs font-mono">
                          <span className="text-[var(--color-text)] font-bold">{b.die_size}</span>
                          <span className="text-[var(--color-muted)] text-[11px]">
                            {b.available} in stock / {b.required_per_set} per set &rarr;{' '}
                            <strong className="text-rose-400">{b.possible_sets} possible</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Target Assessment Card */}
              {result.target_sets !== undefined && result.target_sets !== null && (
                <div className={`border rounded-xl p-5 flex flex-col justify-between ${
                  !result.procurement || result.procurement.length === 0
                    ? 'bg-emerald-500/5 border-emerald-500/30'
                    : 'bg-blue-500/5 border-blue-500/30'
                }`}>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="h-4 w-4 text-blue-400" />
                      <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                        Target Sets Assessment
                      </h3>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-xs text-[var(--color-muted)]">Requested Target:</span>
                      <span className="text-lg font-mono font-black text-[var(--color-text)]">{result.target_sets} sets</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-xs text-[var(--color-muted)]">Target Achievable?</span>
                      <span className={`text-sm font-bold uppercase ${
                        !result.procurement || result.procurement.length === 0
                          ? 'text-emerald-400'
                          : 'text-blue-300'
                      }`}>
                        {!result.procurement || result.procurement.length === 0 ? 'YES' : 'NO (Procurement Needed)'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[var(--color-bg)]/40 rounded-lg p-3 border border-[var(--color-border)]/50 text-[11px] text-[var(--color-muted)] leading-relaxed">
                    {!result.procurement || result.procurement.length === 0 ? (
                      <span className="text-emerald-300 font-medium">
                        ✔ Current stock satisfies the target. No additional purchases are required.
                      </span>
                    ) : (
                      <span>
                        ℹ To achieve the target of {result.target_sets} sets, you must procure{' '}
                        <strong className="text-blue-400">
                          {result.procurement.reduce((acc, p) => acc + p.procure, 0)}
                        </strong>{' '}
                        additional dies across <strong className="text-blue-400">{result.procurement.length}</strong> unique sizes.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Requirements breakdown table with filters & search */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-border)] flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                    Per-Die Breakdown
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/25">
                    {filteredRequirements.length} / {result.requirements.length} rows
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Filters */}
                  <div className="flex items-center rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] p-0.5">
                    <button
                      onClick={() => setTableFilter('all')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                        tableFilter === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      All ({result.requirements.length})
                    </button>
                    <button
                      onClick={() => setTableFilter('bottleneck')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                        tableFilter === 'bottleneck'
                          ? 'bg-rose-600 text-white'
                          : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      Bottlenecks ({result.bottlenecks.length})
                    </button>
                    <button
                      onClick={() => setTableFilter('missing')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                        tableFilter === 'missing'
                          ? 'bg-amber-600 text-white'
                          : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      Missing ({result.missing_dies.length})
                    </button>
                    <button
                      onClick={() => setTableFilter('ok')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                        tableFilter === 'ok'
                          ? 'bg-emerald-600 text-white'
                          : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      OK
                    </button>
                  </div>

                  {/* Table Search */}
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-[var(--color-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      placeholder="Search size..."
                      className="w-32 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg pl-8 pr-2 py-1 text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-blue-500/60"
                    />
                  </div>

                  {/* Actions */}
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                    title="Copy breakdown table to clipboard"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </button>
                  <button
                    onClick={handleDownloadCSV}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/20 transition-colors"
                    title="Export report as CSV"
                  >
                    <Download className="h-3 w-3" />
                    Export CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
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
                    {filteredRequirements.length > 0 ? (
                      filteredRequirements.map((r) => (
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
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-xs text-[var(--color-muted)]">
                          No matching die sizes for the current filter or search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Procurement plan */}
            {result.target_sets !== undefined && result.target_sets !== null && (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-blue-400" />
                    <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                      Procurement Plan — {result.target_sets} complete sets
                    </h3>
                  </div>
                  {result.procurement && result.procurement.length > 0 && (
                    <span className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-300">
                      Total Buy: {result.procurement.reduce((acc, p) => acc + p.procure, 0)} dies
                    </span>
                  )}
                </div>
                {result.procurement && result.procurement.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
                          <th className="px-4 py-2 text-left font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">Die Size</th>
                          <th className="px-4 py-2 text-right font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">Req/Set</th>
                          <th className="px-4 py-2 text-right font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">Needed for Target</th>
                          <th className="px-4 py-2 text-right font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">In Stock</th>
                          <th className="px-4 py-2 text-right font-mono font-bold text-blue-400 uppercase tracking-wider">Procure Shortfall</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.procurement.map((p) => (
                          <tr
                            key={p.die_size}
                            className="border-b border-[var(--color-border)]/50 transition-colors hover:bg-blue-500/[0.02]"
                          >
                            <td className="px-4 py-2 font-mono font-bold text-[var(--color-text)]">{p.die_size}</td>
                            <td className="px-4 py-2 font-mono text-[var(--color-text)] text-right">{p.required_per_set}</td>
                            <td className="px-4 py-2 font-mono text-[var(--color-text)] text-right">{p.target_need}</td>
                            <td className="px-4 py-2 font-mono text-[var(--color-text)] text-right">{p.available}</td>
                            <td className="px-4 py-2 font-mono font-bold text-blue-400 text-right">+{p.procure}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-muted)]">
                    No dies to procure — current inventory already covers the target of{' '}
                    {result.target_sets} sets (maximum is {result.maximum_sets}).
                  </p>
                )}
              </div>
            )}

            {/* Bottleneck dies */}
            {result.bottlenecks.length > 0 && (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                    Bottleneck Dies ({result.bottlenecks.length})
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.bottlenecks.map((b) => (
                    <span
                      key={b.die_size}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 font-mono text-xs font-bold flex items-center gap-1.5"
                    >
                      {b.die_size}
                      <span className="text-rose-400/70 font-normal">
                        ({b.possible_sets} set{b.possible_sets === 1 ? '' : 's'})
                      </span>
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--color-muted)] mt-3 leading-relaxed">
                  These dies are the primary constraint — stocking any of these sizes first will directly increase your total complete set output.
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
                      Missing Dies ({result.missing_dies.length})
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {result.missing_dies.map((m) => (
                      <li key={m.die_size} className="flex items-center justify-between text-xs py-1 border-b border-[var(--color-border)]/40 last:border-0">
                        <span className="font-mono font-bold text-amber-300">{m.die_size}</span>
                        <span className="text-[var(--color-muted)] font-mono">
                          requires {m.quantity}/set · available 0
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
                      Unused Inventory ({result.unused_inventory.length} sizes)
                    </h3>
                  </div>
                  <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {result.unused_inventory.map((u) => (
                      <li key={u.die_size} className="flex items-center justify-between text-xs py-1 border-b border-[var(--color-border)]/40 last:border-0">
                        <span className="font-mono font-bold text-[var(--color-text)]">{u.die_size}</span>
                        <span className="text-[var(--color-muted)] font-mono">× {u.quantity} in stock</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-[var(--color-muted)] mt-3 leading-relaxed">
                    These sizes exist in inventory but are not required for the selected series.
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
  id,
  title,
  description,
  value,
  onChange,
  onKeyDown,
  placeholder,
  badge,
  icon,
}: {
  id: string
  title: string
  description: string
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder: string
  badge?: string
  icon: 'inventory' | 'series'
}) {
  const Icon = icon === 'inventory' ? Layers : icon === 'series' ? FileSpreadsheet : Package
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-blue-400" />
          <label htmlFor={id} className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading cursor-pointer">
            {title}
          </label>
        </div>
        {badge && (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-blue-500/10 border border-blue-500/25 text-blue-300">
            {badge}
          </span>
        )}
      </div>
      <p className="text-[11px] text-[var(--color-muted)] mb-3">{description}</p>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        spellCheck={false}
        className="w-full h-48 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-[var(--color-text)] font-mono text-xs leading-relaxed focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-colors resize-y placeholder:text-slate-600"
      />
    </div>
  )
}