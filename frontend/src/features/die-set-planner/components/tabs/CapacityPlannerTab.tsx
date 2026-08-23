import React, { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Database,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  XCircle,
  Target,
  Calculator,
  Search,
  Copy,
  Download,
  ShoppingCart,
  Package,
  Layers,
} from 'lucide-react'
import { InputCard } from '../widgets/InputCard'
import { HeroCapacityCard } from '../widgets/HeroCapacityCard'
import { BottleneckChart } from '../widgets/BottleneckChart'
import { Skeleton } from '../../../../components/ui/Skeleton'
import { parseInventoryInput, parseSeriesInput, normalizeDieSize, formatDieSize } from '../../domain/parsers'
import { isDieActive } from '../../../../utils/dieHelpers'
import { useApi } from '../../../../hooks/useApi'
import type { DieSetResult, EnamelMachine, DieInventoryRecount } from '../../types'

const SAMPLE_INVENTORY = `0.550\t4
0.555\t4
0.560\t4
0.585\t10
0.620\t8
0.625\t6
0.630\t4
0.635\t4
0.640\t2`

const SAMPLE_SERIES = `0.620
0.625
0.625
0.630
0.635
0.635
0.640
0.640`

const PRESET_FINE_WIRE = `0.050
0.060
0.070
0.080
0.090
0.100
0.110
0.120`

const PRESET_MEDIUM_WIRE = `0.250
0.280
0.300
0.320
0.350
0.380
0.400
0.450`

const PRESET_HEAVY_GAUGE = `1.200
1.300
1.400
1.500
1.600
1.700
1.800`

const INVENTORY_PLACEHOLDER = `0.550    4
0.555    4
0.560    4
0.585    10
0.625    6

Paste size + quantity pairs (e.g. from Excel or DMS database)`

const SERIES_PLACEHOLDER = `0.620
0.625
0.625
0.630
0.635
0.635
0.640
0.640`

type FilterStatus = 'all' | 'bottleneck' | 'missing' | 'ok'

interface CapacityPlannerTabProps {
  result: DieSetResult | null
  loading: boolean
  error: string | null
  onCalculate: (payload: { inventory_text: string; series_text: string; target_sets?: number }) => Promise<void>
  onReset: () => void
  machines?: EnamelMachine[]
  submittedRecounts?: DieInventoryRecount[]
  externalInventory?: string
}

export function CapacityPlannerTab({
  result,
  loading,
  error,
  onCalculate,
  onReset,
  machines,
  submittedRecounts,
  externalInventory,
}: CapacityPlannerTabProps) {
  const { request } = useApi()

  const [inventoryText, setInventoryText] = useState(externalInventory || '')
  const [seriesText, setSeriesText] = useState('')
  const [targetSets, setTargetSets] = useState('')
  const [targetError, setTargetError] = useState<string | null>(null)
  const [showParseErrors, setShowParseErrors] = useState(false)
  const [tableFilter, setTableFilter] = useState<FilterStatus>('all')
  const [tableSearch, setTableSearch] = useState('')
  const [loadingActiveStock, setLoadingActiveStock] = useState(false)
  const [activeStockNotice, setActiveStockNotice] = useState<string | null>(null)

  // Parsing & validation helpers
  const inventoryParse = useMemo(() => parseInventoryInput(inventoryText), [inventoryText])
  const seriesParse = useMemo(() => parseSeriesInput(seriesText), [seriesText])

  const parseErrors = useMemo(() => {
    return [...inventoryParse.errors, ...seriesParse.errors, ...(targetError ? [targetError] : [])]
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

    await onCalculate({
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
    onReset()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (canCalculate) handleCalculate()
    }
  }

  const confirmLoadStock = (callback: () => void) => {
    if (inventoryText.trim() !== '') {
      if (window.confirm('Loading new stock will overwrite your current inventory inputs. Do you want to proceed?')) {
        callback()
      }
    } else {
      callback()
    }
  }

  const handleLoadSample = () => {
    setInventoryText(SAMPLE_INVENTORY)
    setSeriesText(SAMPLE_SERIES)
    setTargetSets('5')
    setTargetError(null)
    setShowParseErrors(false)
    setActiveStockNotice('Loaded sample inventory & series data for testing.')
  }

  const handleLoadPresetSeries = (preset: 'standard' | 'fine' | 'medium' | 'heavy') => {
    if (preset === 'standard') setSeriesText(SAMPLE_SERIES)
    if (preset === 'fine') setSeriesText(PRESET_FINE_WIRE)
    if (preset === 'medium') setSeriesText(PRESET_MEDIUM_WIRE)
    if (preset === 'heavy') setSeriesText(PRESET_HEAVY_GAUGE)
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

  const handleLoadMachineStock = (machId: number) => {
    const selectedMachine = machines?.find((m) => m.id === machId)
    if (!selectedMachine) return

    setLoadingActiveStock(true)
    setActiveStockNotice(null)
    request(`/api/machine-die-stock/?enamel_machine=${machId}`)
      .then((stocks: any) => {
        if (Array.isArray(stocks) && stocks.length > 0) {
          const formattedRows = stocks.map((s: any) => `${s.die_size}\t${s.quantity}`)
          setInventoryText(formattedRows.join('\n'))
          setActiveStockNotice(`Loaded stock levels for enamel machine: ${selectedMachine.name}.`)
        } else {
          setActiveStockNotice(`No inventory stock records found for machine ${selectedMachine.name}.`)
        }
      })
      .catch((err: any) => {
        setActiveStockNotice(`Failed to load stock: ${err.detail || err.message || err}`)
      })
      .finally(() => {
        setLoadingActiveStock(false)
      })
  }

  const handleLoadRecountStock = (recId: number, recountNameStr: string) => {
    setLoadingActiveStock(true)
    setActiveStockNotice(null)
    request(`/api/inventory-recounts/${recId}/`)
      .then((recount: any) => {
        if (recount && Array.isArray(recount.items) && recount.items.length > 0) {
          const formattedRows = recount.items.map((i: any) => `${i.die_size}\t${i.quantity}`)
          setInventoryText(formattedRows.join('\n'))
          setActiveStockNotice(`Loaded inventory from recount sheet: ${recountNameStr}.`)
        } else {
          setActiveStockNotice(`No recount items found on sheet: ${recountNameStr}.`)
        }
      })
      .catch((err: any) => {
        setActiveStockNotice(`Failed to load recount items: ${err.detail || err.message || err}`)
      })
      .finally(() => {
        setLoadingActiveStock(false)
      })
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
    <div className="space-y-6 font-mono">
      {/* Stock Ingestion Toolbar & Series Presets */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Database className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                Stock Source:
              </span>
            </div>
            <select
              onChange={(e) => {
                if (e.target.value === 'all-dms') {
                  confirmLoadStock(() => handleLoadActiveStock())
                } else if (e.target.value.startsWith('mach-')) {
                  const id = Number(e.target.value.split('-')[1])
                  confirmLoadStock(() => handleLoadMachineStock(id))
                } else if (e.target.value.startsWith('rec-')) {
                  const id = Number(e.target.value.split('-')[1])
                  const recountObj = submittedRecounts?.find((r) => r.id === id)
                  confirmLoadStock(() => handleLoadRecountStock(id, recountObj?.name || ''))
                }
                e.target.value = ''
              }}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3.5 py-2 text-xs text-[var(--color-text)] focus:border-blue-500 focus:outline-none cursor-pointer"
              defaultValue=""
            >
              <option value="" disabled>
                -- Choose Ingestion Source --
              </option>
              <option value="all-dms">Authoritative Active DMS Stock (All)</option>
              {machines && machines.length > 0 && (
                <optgroup label="Enamel Machine Live Stocks">
                  {machines.map((m) => (
                    <option key={`mach-${m.id}`} value={`mach-${m.id}`}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {submittedRecounts && submittedRecounts.length > 0 && (
                <optgroup label="Submitted Recount Sheets">
                  {submittedRecounts.map((r) => (
                    <option key={`rec-${r.id}`} value={`rec-${r.id}`}>
                      {r.name} ({r.enamel_machine_name})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadSample}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Sample Set</span>
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] transition cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Quick Series Presets Bar */}
        <div className="pt-3 border-t border-[var(--color-border)] flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider flex items-center gap-1">
            <Layers className="h-3 w-3 text-blue-400" />
            Quick Series Presets:
          </span>
          <button
            type="button"
            onClick={() => handleLoadPresetSeries('standard')}
            className="px-2.5 py-1 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-surface-2)] text-xs text-[var(--color-text)] border border-[var(--color-border)] transition cursor-pointer"
          >
            Standard Enamel (0.620 - 0.640 mm)
          </button>
          <button
            type="button"
            onClick={() => handleLoadPresetSeries('fine')}
            className="px-2.5 py-1 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-surface-2)] text-xs text-[var(--color-text)] border border-[var(--color-border)] transition cursor-pointer"
          >
            Fine Wire (0.050 - 0.120 mm)
          </button>
          <button
            type="button"
            onClick={() => handleLoadPresetSeries('medium')}
            className="px-2.5 py-1 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-surface-2)] text-xs text-[var(--color-text)] border border-[var(--color-border)] transition cursor-pointer"
          >
            Medium Wire (0.250 - 0.450 mm)
          </button>
          <button
            type="button"
            onClick={() => handleLoadPresetSeries('heavy')}
            className="px-2.5 py-1 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-surface-2)] text-xs text-[var(--color-text)] border border-[var(--color-border)] transition cursor-pointer"
          >
            Heavy Gauge (1.200 - 1.800 mm)
          </button>
        </div>
      </div>

      {/* Ingestion notice */}
      {activeStockNotice && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 flex items-center justify-between text-xs text-blue-300">
          <div className="flex items-center gap-2.5">
            <Database className="h-4 w-4 shrink-0 text-blue-400" />
            <span>{activeStockNotice}</span>
          </div>
          <button
            onClick={() => setActiveStockNotice(null)}
            className="text-blue-400/70 hover:text-blue-200 font-bold ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Dual Pasteboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <InputCard
          id="inventory-input"
          icon="inventory"
          title="Current Die Stock"
          description="Paste die size + quantity pairs — supports tabs, spaces, Excel rows, mm/inch units, comma decimals, and multiple batches."
          value={inventoryText}
          onChange={(v) => {
            setInventoryText(v)
            setShowParseErrors(false)
          }}
          onKeyDown={handleKeyDown}
          placeholder={INVENTORY_PLACEHOLDER}
          badge={
            inventoryParse.rows.length > 0
              ? `${inventoryParse.rows.length} size${inventoryParse.rows.length === 1 ? '' : 's'}`
              : undefined
          }
        />
        <InputCard
          id="series-input"
          icon="series"
          title="Die Series Specification"
          badge={
            seriesParse.sizes.length > 0
              ? `${seriesParse.sizes.length} die${seriesParse.sizes.length === 1 ? '' : 's'} per set`
              : undefined
          }
          description="Paste all die sizes required for ONE set. Duplicate sizes indicate multiple passes of that diameter per set."
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
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              Unable to calculate — verify inputs below
            </h4>
          </div>
          <ul className="space-y-1">
            {parseErrors.map((msg, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-rose-300">
                <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{msg}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Backend error */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Calculation failed</h4>
          </div>
          <p className="text-xs text-rose-300">{error}</p>
        </div>
      )}

      {/* Target Sets & Calculate Trigger */}
      <div className="flex flex-col items-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3.5 py-2">
            <Target className="h-4 w-4 text-blue-400" />
            <label className="text-xs text-[var(--color-muted)] font-bold uppercase tracking-wider" htmlFor="target-sets">
              Target Sets (Optional):
            </label>
            <input
              id="target-sets"
              type="number"
              min={0}
              max={1000000000}
              step={1}
              value={targetSets}
              onChange={(e) => setTargetSets(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canCalculate && handleCalculate()}
              placeholder="e.g. 10"
              className="w-24 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2.5 py-1 text-[var(--color-text)] font-mono text-xs text-center focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleCalculate}
            disabled={!canCalculate}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-[var(--color-surface-2)] disabled:text-[var(--color-muted)] text-white text-xs font-bold uppercase tracking-wider shadow-md transition cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4" />
                Calculate Set Capacity
              </>
            )}
          </button>
        </div>
        <span className="text-[10px] text-[var(--color-muted)]">
          Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] font-bold">Ctrl+Enter</kbd> to calculate immediately
        </span>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && !error && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-16 text-center shadow-sm">
          <Layers className="h-10 w-10 text-[var(--color-border)] mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider mb-2 font-heading">
            {hasInput ? 'Ready to calculate' : 'No Calculation Active'}
          </h3>
          <p className="text-xs text-[var(--color-muted)] max-w-md mx-auto leading-relaxed mb-6">
            Paste your current die stock and required series above, or select a source under <span className="text-blue-400 font-semibold">Stock Source</span>.
          </p>
          <button
            onClick={handleLoadSample}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-300 hover:bg-blue-600/20 transition cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Try Sample Calculation
          </button>
        </div>
      )}

      {/* Calculation Results */}
      {result && !loading && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* 1. Hero KPI Card */}
          <HeroCapacityCard
            maximumSets={result.maximum_sets}
            totalDiesPerSet={result.total_dies_per_set}
            requirementsCount={result.requirements.length}
            bottleneckCount={result.bottlenecks.length}
            missingCount={result.missing_dies.length}
          />

          {/* Warnings */}
          {result.warnings.map((msg) => (
            <div key={msg} className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300 leading-relaxed">{msg}</p>
            </div>
          ))}

          {/* Capacity Explanation & Target Assessment Deck */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Explanation */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 flex flex-col justify-between shadow-sm space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                    Capacity Mechanics
                  </h3>
                </div>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                  {result.maximum_sets === 0 ? (
                    <>
                      Assembly is blocked (<strong>0 sets</strong>) due to{' '}
                      <strong className="text-rose-400">{result.missing_dies.length} missing die sizes</strong>.
                    </>
                  ) : (
                    <>
                      Current assembly capacity is limited to <strong>{result.maximum_sets} complete sets</strong> by{' '}
                      <strong className="text-rose-400">{result.bottlenecks.length} bottleneck sizes</strong>.
                    </>
                  )}
                </p>
              </div>

              {result.bottlenecks.length > 0 && (
                <div className="bg-[var(--color-bg)] rounded-xl p-3.5 border border-[var(--color-border)] space-y-2">
                  <div className="text-[10px] uppercase font-mono font-bold text-[var(--color-muted)]">
                    Primary Limiting Sizes:
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                    {result.bottlenecks.map((b) => (
                      <div key={b.die_size} className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[var(--color-text)] font-bold">{b.die_size} mm</span>
                        <span className="text-[var(--color-muted)] text-[11px]">
                          {b.available} avail / {b.required_per_set} req &rarr;{' '}
                          <strong className="text-rose-400">{b.possible_sets} sets</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Target Assessment */}
            {result.target_sets !== undefined && result.target_sets !== null && (
              <div
                className={`border rounded-2xl p-5 flex flex-col justify-between shadow-sm space-y-4 ${
                  !result.procurement || result.procurement.length === 0
                    ? 'bg-emerald-500/5 border-emerald-500/30'
                    : 'bg-blue-500/5 border-blue-500/30'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                      <Target className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                      Target Sets Assessment
                    </h3>
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs text-[var(--color-muted)]">Target Requested:</span>
                    <span className="text-base font-mono font-bold text-[var(--color-text)]">
                      {result.target_sets} complete sets
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-[var(--color-muted)]">Achievable:</span>
                    <span
                      className={`text-xs font-bold uppercase ${
                        !result.procurement || result.procurement.length === 0
                          ? 'text-emerald-400'
                          : 'text-blue-300'
                      }`}
                    >
                      {!result.procurement || result.procurement.length === 0
                        ? 'YES (Stock Sufficient)'
                        : 'NO (Procurement Shortfall)'}
                    </span>
                  </div>
                </div>

                <div className="bg-[var(--color-bg)]/50 rounded-xl p-3 border border-[var(--color-border)] text-[11px] text-[var(--color-muted)] leading-relaxed">
                  {!result.procurement || result.procurement.length === 0 ? (
                    <span className="text-emerald-300 font-medium">
                      ✔ Current stock completely satisfies this target schedule.
                    </span>
                  ) : (
                    <span>
                      ℹ To achieve {result.target_sets} sets, procure{' '}
                      <strong className="text-blue-400">
                        {result.procurement.reduce((acc, p) => acc + p.procure, 0)} additional dies
                      </strong>{' '}
                      across <strong className="text-blue-400">{result.procurement.length} sizes</strong>.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Deficit Analytics Bar Chart */}
          <BottleneckChart result={result} />

          {/* Breakdown Table */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[var(--color-border)] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                  Per-Die Breakdown
                </h3>
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/25">
                  {filteredRequirements.length} sizes
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--color-muted)]" />
                  <input
                    type="text"
                    placeholder="Search size..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="pl-9 pr-4 py-1.5 w-44 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text)] focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Filters */}
                <div className="flex items-center rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] p-1 gap-1">
                  {(['all', 'bottleneck', 'missing', 'ok'] as FilterStatus[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setTableFilter(f)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider transition cursor-pointer ${
                        tableFilter === f
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Export Buttons */}
                <div className="flex items-center gap-1.5 border-l border-[var(--color-border)] pl-3">
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition cursor-pointer"
                    title="Copy table results to clipboard"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={handleDownloadCSV}
                    className="p-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition cursor-pointer"
                    title="Download report as CSV file"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)] font-mono text-[10px] text-[var(--color-muted)] uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Die Size (mm)</th>
                    <th className="py-3 px-4 text-center font-semibold">Req / Set</th>
                    <th className="py-3 px-4 text-center font-semibold">Avail Stock</th>
                    <th className="py-3 px-4 text-center font-semibold">Sets Possible</th>
                    <th className="py-3 px-4 text-center font-semibold">Used Dies</th>
                    <th className="py-3 px-4 text-center font-semibold">Remaining</th>
                    <th className="py-3 px-4 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]/60 font-mono">
                  {filteredRequirements.map((r) => {
                    const statusText = r.is_missing ? 'MISSING' : r.is_bottleneck ? 'BOTTLENECK' : 'OK'
                    const statusStyle = r.is_missing
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                      : r.is_bottleneck
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'

                    return (
                      <tr key={r.die_size} className="hover:bg-[var(--color-surface-2)] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[var(--color-text)]">{r.die_size}</td>
                        <td className="py-3.5 px-4 text-center text-[var(--color-text)]">{r.required_per_set}</td>
                        <td className="py-3.5 px-4 text-center text-[var(--color-muted)]">{r.available}</td>
                        <td
                          className={`py-3.5 px-4 text-center font-bold ${
                            r.is_bottleneck ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {r.possible_sets === 1000000000 ? '∞' : r.possible_sets}
                        </td>
                        <td className="py-3.5 px-4 text-center text-[var(--color-muted)]">{r.used}</td>
                        <td className="py-3.5 px-4 text-center text-[var(--color-text)]">{r.remaining}</td>
                        <td className="py-3.5 px-4 text-right">
                          <span className={`inline-block px-2.5 py-0.5 text-[9px] font-bold rounded-full border ${statusStyle}`}>
                            {statusText}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRequirements.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[var(--color-muted)] font-sans">
                        No sizes match the current search or filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Procurement Table */}
          {result.procurement && result.procurement.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                    <ShoppingCart className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                    Procurement Schedule (Target: {result.target_sets} sets)
                  </h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)] font-mono text-[10px] text-[var(--color-muted)] uppercase tracking-wider">
                      <th className="py-3 px-4 font-semibold">Die Size (mm)</th>
                      <th className="py-3 px-4 text-center font-semibold">Req / Set</th>
                      <th className="py-3 px-4 text-center font-semibold">Target Total</th>
                      <th className="py-3 px-4 text-center font-semibold">In Stock</th>
                      <th className="py-3 px-4 text-right font-semibold">Units to Purchase</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]/60 font-mono">
                    {result.procurement.map((p) => (
                      <tr key={p.die_size} className="hover:bg-[var(--color-surface-2)] transition">
                        <td className="py-3.5 px-4 font-bold text-[var(--color-text)]">{p.die_size}</td>
                        <td className="py-3.5 px-4 text-center text-[var(--color-muted)]">{p.required_per_set}</td>
                        <td className="py-3.5 px-4 text-center text-[var(--color-text)] font-semibold">{p.target_need}</td>
                        <td className="py-3.5 px-4 text-center text-[var(--color-muted)]">{p.available}</td>
                        <td className="py-3.5 px-4 text-right text-blue-400 font-bold">+{p.procure}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Surplus Stock */}
          {result.unused_inventory.length > 0 && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Package className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                  Surplus / Unused Dies in Inventory
                </h3>
              </div>
              <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
                The following sizes are currently in stock but not required for this series assembly:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {result.unused_inventory.map((item) => (
                  <div
                    key={item.die_size}
                    className="flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-1.5 rounded-xl text-xs font-mono"
                  >
                    <span className="text-[var(--color-text)] font-bold">{item.die_size} mm</span>
                    <span className="text-[var(--color-border)]">|</span>
                    <span className="text-[var(--color-muted)]">{item.quantity} surplus</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
