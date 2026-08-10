import { useMemo, useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { motion, AnimatePresence } from 'framer-motion'
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
  Plus,
  Calendar,
  User,
  Eye,
  Trash2,
  Check,
  TrendingUp,
  Settings,
} from 'lucide-react'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Skeleton } from '../../../components/ui/Skeleton'
import { parseInventoryInput, parseSeriesInput, normalizeDieSize, formatDieSize } from '../domain/parsers'
import { useDieSetPlanner } from '../hooks/useDieSetPlanner'
import { useApi } from '../../../hooks/useApi'
import { isDieActive } from '../../../utils/dieHelpers'
import {
  useMachineDieStocks,
  useDieInventoryRecounts,
  useDieInventoryRecount,
  useCreateRecount,
  useUpdateRecount,
  useSubmitRecount,
  useEnamelMachines,
  useCreateEnamelMachine,
  useUpdateEnamelMachine,
  useDeleteEnamelMachine,
} from '../hooks/useDieInventory'

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
type TabType = 'calculator' | 'live-stock' | 'recounts'

export function DieSetPlannerPage() {
  const [activeTab, setActiveTab] = useState<TabType>('calculator')

  // Calculator Page States
  const [inventoryText, setInventoryText] = useState('')
  const [seriesText, setSeriesText] = useState('')
  const [targetSets, setTargetSets] = useState('')
  const [targetError, setTargetError] = useState<string | null>(null)
  const [showParseErrors, setShowParseErrors] = useState(false)
  const [tableFilter, setTableFilter] = useState<FilterStatus>('all')
  const [tableSearch, setTableSearch] = useState('')
  const [loadingActiveStock, setLoadingActiveStock] = useState(false)
  const [activeStockNotice, setActiveStockNotice] = useState<string | null>(null)

  // Live Machine Stock Page States
  const [selectedMachineId, setSelectedMachineId] = useState<number | undefined>(undefined)
  const [stockSearch, setStockSearch] = useState('')

  // Recount Sheets Page States
  const [selectedRecountId, setSelectedRecountId] = useState<number | undefined>(undefined)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isManageMachinesOpen, setIsManageMachinesOpen] = useState(false)
  
  // Create / Edit Recount Form States
  const [recountId, setRecountId] = useState<number | undefined>(undefined) // undefined = create, otherwise edit
  const [recountName, setRecountName] = useState('')
  const [recountMachineId, setRecountMachineId] = useState<number | undefined>(undefined)
  const [recountDate, setRecountDate] = useState(new Date().toISOString().slice(0, 10))
  const [recountItems, setRecountItems] = useState<{ die_size: string; quantity: number }[]>([])
  
  // Recount size input form states
  const [newSize, setNewSize] = useState('')
  const [newQty, setNewQty] = useState('')
  const [inputMode, setInputMode] = useState<'single' | 'bulk' | 'excel'>('single')
  const [bulkRecountText, setBulkRecountText] = useState('')

  // Enamel Machine Management Form States
  const [newMachineName, setNewMachineName] = useState('')
  const [newMachineDesc, setNewMachineDesc] = useState('')

  // API Hooks
  const { result, loading, error, calculate, reset } = useDieSetPlanner()
  const { request } = useApi()

  const { data: machines, refetch: refetchMachines } = useEnamelMachines()
  const { data: liveStocks, isLoading: isLoadingStocks, refetch: refetchStocks } = useMachineDieStocks(selectedMachineId)
  const { data: recounts, isLoading: isLoadingRecounts } = useDieInventoryRecounts()

  const createRecount = useCreateRecount()
  const updateRecount = useUpdateRecount()
  const submitRecount = useSubmitRecount()

  const createMachine = useCreateEnamelMachine()
  const deleteMachine = useDeleteEnamelMachine()

  // Auto-select first machine when lists load
  useMemo(() => {
    if (machines && machines.length > 0 && selectedMachineId === undefined) {
      setSelectedMachineId(machines[0].id)
    }
  }, [machines, selectedMachineId])

  // Parsing & calculations helpers for manual inputs
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
    setActiveStockNotice('Loaded sample inventory & series data for testing.')
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
    const selectedMachine = machines?.find(m => m.id === machId)
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

  const handleAnalyzeMachineInPlanner = (machId: number) => {
    handleLoadMachineStock(machId)
    setActiveTab('calculator')
  }

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

  // Recount methods
  const handleOpenCreateRecount = () => {
    setRecountId(undefined)
    setRecountName(`Audit - ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`)
    setRecountMachineId(machines && machines.length > 0 ? machines[0].id : undefined)
    setRecountDate(new Date().toISOString().slice(0, 10))
    setRecountItems([])
    setInputMode('single')
    setBulkRecountText('')
    setIsModalOpen(true)
  }

  const handleOpenEditRecount = (r: any) => {
    setRecountId(r.id)
    setRecountName(r.name)
    setRecountMachineId(r.enamel_machine)
    setRecountDate(r.recount_date)
    setRecountItems(r.items.map((i: any) => ({ die_size: i.die_size, quantity: i.quantity })))
    setInputMode('single')
    setBulkRecountText('')
    setIsModalOpen(true)
  }

  const handleLoadBaselineFromStock = () => {
    if (!recountMachineId) return
    request(`/api/machine-die-stock/?enamel_machine=${recountMachineId}`)
      .then((stocks: any) => {
        if (Array.isArray(stocks)) {
          const items = stocks.map((s: any) => ({ die_size: s.die_size, quantity: s.quantity }))
          setRecountItems(items)
        }
      })
      .catch(() => undefined)
  }

  const handleImportBulkRecount = (merge: boolean) => {
    if (!bulkRecountText.trim()) return
    const parsed = parseInventoryInput(bulkRecountText)
    
    const newItems = parsed.rows.map((row) => ({
      die_size: row.dieSize,
      quantity: row.quantity,
    }))

    if (parsed.errors.length > 0) {
      alert(`Parsed with some warnings:\n${parsed.errors.join('\n')}`)
    }

    if (merge) {
      const merged = [...recountItems]
      newItems.forEach((newItem) => {
        const idx = merged.findIndex((i) => i.die_size === newItem.die_size)
        if (idx > -1) {
          merged[idx].quantity = newItem.quantity
        } else {
          merged.push(newItem)
        }
      })
      setRecountItems(merged)
    } else {
      setRecountItems(newItems)
    }

    setBulkRecountText('')
    setInputMode('single')
  }

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        if (!bstr) return
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
        
        const parsedRows: Array<{ die_size: string; quantity: number }> = []
        let warningMsgs: string[] = []

        for (let rIdx = 0; rIdx < data.length; rIdx++) {
          const row = data[rIdx]
          if (!Array.isArray(row) || row.length === 0) continue

          const sizeVal = row[0]
          const qtyVal = row[1]

          if (sizeVal === undefined || sizeVal === null) continue

          const sizeStr = String(sizeVal).trim()
          if (!sizeStr) continue

          // Skip headers (non-numeric first column like "Size", "Die Size", "Name")
          if (sizeStr.toLowerCase().includes('size') || sizeStr.toLowerCase().includes('die') || sizeStr.toLowerCase().includes('name') || sizeStr.toLowerCase().includes('dimension')) {
            continue
          }

          const { hundredThousands } = normalizeDieSize(sizeStr)
          if (hundredThousands === null) {
            if (isNaN(Number(sizeStr.replace(/[^\d.-]/g, '')))) {
              continue // skip probable header row silently
            }
            warningMsgs.push(`Row ${rIdx + 1}: Invalid size format "${sizeStr}"`)
            continue
          }

          let qty = 0
          if (qtyVal !== undefined && qtyVal !== null) {
            qty = parseInt(String(qtyVal))
            if (isNaN(qty) || qty < 0) {
              warningMsgs.push(`Row ${rIdx + 1}: Invalid quantity "${qtyVal}". Defaulted to 0.`)
              qty = 0
            }
          }

          const cleanSize = formatDieSize(hundredThousands)
          
          const existing = parsedRows.find(item => item.die_size === cleanSize)
          if (existing) {
            existing.quantity += qty
          } else {
            parsedRows.push({
              die_size: cleanSize,
              quantity: qty
            })
          }
        }

        if (parsedRows.length === 0) {
          alert("No valid die size & quantity rows found. Please verify Column A has sizes (e.g. 0.620) and Column B has quantities (e.g. 5).")
          return
        }

        if (warningMsgs.length > 0) {
          alert(`Imported with some warnings:\n${warningMsgs.slice(0, 5).join('\n')}${warningMsgs.length > 5 ? '\n...and more warnings' : ''}`)
        }

        setRecountItems(parsedRows)
        alert(`Successfully imported ${parsedRows.length} items from ${file.name}!`)
        setInputMode('single')
      } catch (err: any) {
        alert(`Failed to parse Excel file: ${err.message || err}`)
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleAddRecountItem = () => {
    if (!newSize || !newQty) return
    const { hundredThousands } = normalizeDieSize(newSize)
    if (hundredThousands === null) {
      alert("Invalid die size input format.")
      return
    }
    const cleanSize = formatDieSize(hundredThousands)
    const quantity = parseInt(newQty)
    if (isNaN(quantity) || quantity < 0) {
      alert("Invalid quantity. Must be a whole number.")
      return
    }

    // Check if duplicate size, merge quantity or replace
    const existingIndex = recountItems.findIndex((i) => i.die_size === cleanSize)
    if (existingIndex > -1) {
      const updated = [...recountItems]
      updated[existingIndex].quantity = quantity
      setRecountItems(updated)
    } else {
      setRecountItems([...recountItems, { die_size: cleanSize, quantity }])
    }

    setNewSize('')
    setNewQty('')
  }

  const handleRemoveRecountItem = (index: number) => {
    const updated = [...recountItems]
    updated.splice(index, 1)
    setRecountItems(updated)
  }

  const handleSaveRecount = async () => {
    if (!recountName.trim()) {
      alert('Recount Sheet Name is required')
      return
    }
    if (!recountMachineId) {
      alert('Please select a Machine')
      return
    }

    const payload = {
      name: recountName,
      enamel_machine: recountMachineId,
      recount_date: recountDate,
      items: recountItems,
    }

    try {
      if (recountId) {
        await updateRecount.mutateAsync({ id: recountId, data: payload })
      } else {
        await createRecount.mutateAsync(payload)
      }
      setIsModalOpen(false)
    } catch (err: any) {
      alert(`Failed to save recount sheet: ${err.message || err}`)
    }
  }

  const handleSubmitRecountCommit = async (id: number) => {
    if (!confirm('Are you sure you want to submit this recount sheet? This will permanently update the machine stock levels to match this sheet.')) {
      return
    }
    try {
      await submitRecount.mutateAsync(id)
      if (selectedMachineId) {
        refetchStocks()
      }
    } catch (err: any) {
      alert(`Failed to commit recount sheet: ${err.message || err}`)
    }
  }

  // Enamel Machine Management Methods
  const handleCreateEnamelMachine = async () => {
    if (!newMachineName.trim()) {
      alert('Machine Name is required')
      return
    }
    try {
      await createMachine.mutateAsync({
        name: newMachineName,
        description: newMachineDesc,
      })
      setNewMachineName('')
      setNewMachineDesc('')
      refetchMachines()
    } catch (err: any) {
      alert(`Failed to create enamel machine: ${err.message || err}`)
    }
  }

  const handleDeleteEnamelMachine = async (id: number) => {
    if (!confirm('Are you sure you want to delete this enamel machine? All associated stock levels and recounts will also be deleted.')) {
      return
    }
    try {
      await deleteMachine.mutateAsync(id)
      refetchMachines()
      if (selectedMachineId === id) {
        setSelectedMachineId(undefined)
      }
    } catch (err: any) {
      alert(`Failed to delete machine: ${err.message || err}`)
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[var(--color-bg)]">
      <PageHeader
        title="Die Set Planner"
        subtitle="Operational planning, live stock ledger and monthly stocktake audit sheets for enamel dies"
        breadcrumbs={[
          { label: 'Tools', href: '/tools' },
          { label: 'Die Set Planner' },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 space-y-6">
        
        {/* Tab Selector */}
        <div className="flex border-b border-[var(--color-border)] mb-6">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'calculator'
                ? 'border-blue-500 text-blue-400 font-bold bg-blue-500/5'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <Calculator className="h-4 w-4" />
            Capacity Calculator
          </button>
          <button
            onClick={() => {
              setActiveTab('live-stock')
              if (!selectedMachineId && machines && machines.length > 0) {
                setSelectedMachineId(machines[0].id)
              }
            }}
            className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'live-stock'
                ? 'border-blue-500 text-blue-400 font-bold bg-blue-500/5'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <Layers className="h-4 w-4" />
            Live Machine Stock
          </button>
          <button
            onClick={() => setActiveTab('recounts')}
            className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'recounts'
                ? 'border-blue-500 text-blue-400 font-bold bg-blue-500/5'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <ClipboardPaste className="h-4 w-4" />
            Stocktake & Recounts
          </button>
        </div>

        {/* Tab Panels */}
        {activeTab === 'calculator' && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Live Machine Loader */}
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                    Quick Load Stock:
                  </span>
                </div>
                <select
                  onChange={(e) => {
                    if (e.target.value === 'all-dms') {
                      handleLoadActiveStock()
                    } else if (e.target.value.startsWith('mach-')) {
                      const id = Number(e.target.value.split('-')[1])
                      handleLoadMachineStock(id)
                    } else if (e.target.value.startsWith('rec-')) {
                      const id = Number(e.target.value.split('-')[1])
                      const recountObj = recounts?.find(r => r.id === id)
                      handleLoadRecountStock(id, recountObj?.name || '')
                    }
                    e.target.value = ''
                  }}
                  className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text)] focus:border-blue-500 focus:outline-none"
                  defaultValue=""
                >
                  <option value="" disabled>-- Choose Stock Source --</option>
                  <option value="all-dms">Authoritative Active DMS Stock (All)</option>
                  {machines && machines.length > 0 && (
                    <optgroup label="Enamel Machine Live Stocks">
                      {machines.map(m => (
                        <option key={`mach-${m.id}`} value={`mach-${m.id}`}>{m.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {recounts && recounts.filter(r => r.status === 'SUBMITTED').length > 0 && (
                    <optgroup label="Submitted Recount Sheets">
                      {recounts.filter(r => r.status === 'SUBMITTED').map(r => (
                        <option key={`rec-${r.id}`} value={`rec-${r.id}`}>{r.name} ({r.enamel_machine_name})</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={handleLoadSample}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  Sample Data
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
            </div>

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
                  Paste your current die inventory and a die series above, or select a stock source under{' '}
                  <span className="text-blue-400 font-semibold">Quick Load Stock</span>.
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

            {/* Results Section */}
            {result && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
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
                        {filteredRequirements.length} size{filteredRequirements.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--color-muted)]" />
                        <input
                          type="text"
                          placeholder="Search die size..."
                          value={tableSearch}
                          onChange={(e) => setTableSearch(e.target.value)}
                          className="pl-9 pr-4 py-1.5 w-44 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text)] focus:border-blue-500 focus:outline-none transition-colors"
                        />
                      </div>

                      {/* Filters */}
                      <div className="flex items-center rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] p-0.5">
                        {(['all', 'bottleneck', 'missing', 'ok'] as FilterStatus[]).map((f) => (
                          <button
                            key={f}
                            onClick={() => setTableFilter(f)}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider transition-colors ${
                              tableFilter === f
                                ? 'bg-blue-500/10 text-blue-400'
                                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>

                      {/* CSV and Clipboard Actions */}
                      <div className="flex items-center gap-1.5 border-l border-[var(--color-border)] pl-3">
                        <button
                          onClick={handleCopy}
                          className="p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                          title="Copy table results to clipboard"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={handleDownloadCSV}
                          className="p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
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
                        <tr className="bg-[var(--color-bg)]/50 border-b border-[var(--color-border)] font-mono text-[10px] text-[var(--color-muted)] uppercase tracking-wider">
                          <th className="py-3 px-4 font-semibold">Die Size (mm)</th>
                          <th className="py-3 px-4 text-center font-semibold">Required/Set</th>
                          <th className="py-3 px-4 text-center font-semibold">Available Stock</th>
                          <th className="py-3 px-4 text-center font-semibold">Possible Sets</th>
                          <th className="py-3 px-4 text-center font-semibold">Used Dies</th>
                          <th className="py-3 px-4 text-center font-semibold">Remaining Stock</th>
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
                            <tr key={r.die_size} className="hover:bg-slate-900/10 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-[var(--color-text)]">
                                {r.die_size}
                              </td>
                              <td className="py-3.5 px-4 text-center text-[var(--color-text)]">
                                {r.required_per_set}
                              </td>
                              <td className="py-3.5 px-4 text-center text-[var(--color-muted)]">
                                {r.available}
                              </td>
                              <td className={`py-3.5 px-4 text-center font-bold ${r.is_bottleneck ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {r.possible_sets === 1000000000 ? '∞' : r.possible_sets}
                              </td>
                              <td className="py-3.5 px-4 text-center text-[var(--color-muted)]">
                                {r.used}
                              </td>
                              <td className="py-3.5 px-4 text-center text-[var(--color-text)]">
                                {r.remaining}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-md border ${statusStyle}`}>
                                  {statusText}
                                </span>
                              </td>
                            </tr>
                          )
                        })}

                        {filteredRequirements.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-[var(--color-muted)] font-sans">
                              No sizes match the current filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Procurement Plan Table */}
                {result.procurement && result.procurement.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-blue-400" />
                        <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                          Procurement Plan & Shortfalls (Target: {result.target_sets} sets)
                        </h3>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[var(--color-bg)]/50 border-b border-[var(--color-border)] font-mono text-[10px] text-[var(--color-muted)] uppercase tracking-wider">
                            <th className="py-3 px-4 font-semibold">Die Size (mm)</th>
                            <th className="py-3 px-4 text-center font-semibold">Required Per Set</th>
                            <th className="py-3 px-4 text-center font-semibold">Total Needed for Target</th>
                            <th className="py-3 px-4 text-center font-semibold">In Stock</th>
                            <th className="py-3 px-4 text-right font-semibold">To Purchase</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]/60 font-mono">
                          {result.procurement.map((p) => (
                            <tr key={p.die_size} className="hover:bg-slate-900/10 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-[var(--color-text)]">{p.die_size}</td>
                              <td className="py-3.5 px-4 text-center text-[var(--color-muted)]">{p.required_per_set}</td>
                              <td className="py-3.5 px-4 text-center text-[var(--color-text)] font-semibold">{p.target_need}</td>
                              <td className="py-3.5 px-4 text-center text-[var(--color-muted)]">{p.available}</td>
                              <td className="py-3.5 px-4 text-right text-blue-400 font-black">
                                +{p.procure}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}

                {/* Unused Inventory Panel */}
                {result.unused_inventory.length > 0 && (
                  <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="h-4 w-4 text-emerald-400" />
                      <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                        Unused / Surplus Stock
                      </h3>
                    </div>
                    <p className="text-[11px] text-[var(--color-muted)] mb-4 leading-relaxed">
                      The following sizes are in your inventory but not required by this series. They can be safely stored or allocated elsewhere.
                    </p>
                    <div className="flex flex-wrap gap-2.5 max-h-36 overflow-y-auto pr-2">
                      {result.unused_inventory.map((item) => (
                        <div
                          key={item.die_size}
                          className="flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-1.5 rounded-lg text-xs font-mono"
                        >
                          <span className="text-[var(--color-text)] font-bold">{item.die_size}</span>
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
        )}

        {/* Tab 2: Live Machine Stock */}
        {activeTab === 'live-stock' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-blue-400 animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)]">Live Allocation Stocks</h3>
                  <p className="text-xs text-[var(--color-muted)]">Track what die sizes and quantities are physically inside each enameling machine.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider font-heading">Enamel Machine:</span>
                <select
                  value={selectedMachineId || ''}
                  onChange={(e) => setSelectedMachineId(Number(e.target.value))}
                  className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] font-bold focus:border-blue-500 focus:outline-none"
                >
                  <option value="" disabled>-- Select Enamel Machine --</option>
                  {machines?.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                
                {/* Manage Enamel Machines Config Button */}
                <button
                  onClick={() => setIsManageMachinesOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                  title="Configure Enamel Machines List"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Manage List
                </button>
              </div>
            </div>

            {isLoadingStocks ? (
              <div className="space-y-3">
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-44 rounded-lg" />
              </div>
            ) : liveStocks && liveStocks.length > 0 ? (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--color-border)] flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">Live Sizes Allocation</h3>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/25">
                      {liveStocks.length} unique sizes
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-[var(--color-muted)]" />
                      <input
                        type="text"
                        placeholder="Search size..."
                        value={stockSearch}
                        onChange={(e) => setStockSearch(e.target.value)}
                        className="pl-9 pr-4 py-1.5 w-44 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text)] focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                    {selectedMachineId && (
                      <button
                        onClick={() => handleAnalyzeMachineInPlanner(selectedMachineId)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                      >
                        <Calculator className="h-3.5 w-3.5" />
                        Run Calculator
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--color-bg)]/50 border-b border-[var(--color-border)] font-mono text-[10px] text-[var(--color-muted)] uppercase tracking-wider">
                        <th className="py-3 px-4 font-semibold">Die Size (mm)</th>
                        <th className="py-3 px-4 text-center font-semibold">Allocated Quantity</th>
                        <th className="py-3 px-4 text-right font-semibold">Last Counted Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]/60 font-mono">
                      {liveStocks
                        .filter((s) => !stockSearch.trim() || s.die_size.includes(stockSearch.trim()))
                        .map((s) => (
                          <tr key={s.id} className="hover:bg-slate-900/10 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-[var(--color-text)]">{s.die_size}</td>
                            <td className="py-3.5 px-4 text-center font-black text-blue-400">{s.quantity}</td>
                            <td className="py-3.5 px-4 text-right text-[var(--color-muted)]">
                              {new Date(s.updated_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-16 text-center">
                <Database className="h-10 w-10 text-[var(--color-border)] mx-auto mb-4" />
                <h3 className="text-sm font-bold text-[var(--color-text)] mb-2">No Active Stock Levels</h3>
                <p className="text-xs text-[var(--color-muted)] max-w-md mx-auto leading-relaxed mb-6">
                  {selectedMachineId
                    ? "No stock records have been initialized for this machine yet. To record dies, complete and submit a recount sheet in the **Stocktake & Recounts** tab."
                    : "Please select or create an enamel machine to view stock levels."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Stocktake & Recounts */}
        {activeTab === 'recounts' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
              <div className="flex items-center gap-3">
                <ClipboardPaste className="h-5 w-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)]">Monthly Audits & Recounts</h3>
                  <p className="text-xs text-[var(--color-muted)]">Record monthly audits of dies on a recount sheet, and commit them to update live enamel machine stocks.</p>
                </div>
              </div>
              
              <button
                onClick={handleOpenCreateRecount}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                disabled={!machines || machines.length === 0}
              >
                <Plus className="h-4 w-4" />
                Create Recount Sheet
              </button>
            </div>

            {isLoadingRecounts ? (
              <div className="space-y-3">
                <Skeleton className="h-12 rounded-lg" />
                <Skeleton className="h-28 rounded-lg" />
              </div>
            ) : recounts && recounts.length > 0 ? (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--color-bg)]/50 border-b border-[var(--color-border)] font-mono text-[10px] text-[var(--color-muted)] uppercase tracking-wider">
                        <th className="py-3 px-4 font-semibold">Audit Name</th>
                        <th className="py-3 px-4 font-semibold">Enamel Machine</th>
                        <th className="py-3 px-4 text-center font-semibold">Audit Date</th>
                        <th className="py-3 px-4 text-center font-semibold">Created By</th>
                        <th className="py-3 px-4 text-center font-semibold">Status</th>
                        <th className="py-3 px-4 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]/60 font-sans">
                      {recounts.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-900/10 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[var(--color-text)]">{r.name}</td>
                          <td className="py-3.5 px-4 text-[var(--color-text)]">{r.enamel_machine_name}</td>
                          <td className="py-3.5 px-4 text-center text-xs font-mono text-[var(--color-muted)]">{r.recount_date}</td>
                          <td className="py-3.5 px-4 text-center text-[var(--color-muted)]">
                            <span className="inline-flex items-center gap-1">
                              <User className="h-3 w-3 text-slate-500" />
                              {r.created_by_username}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-md border ${
                              r.status === 'SUBMITTED'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {r.status === 'DRAFT' ? (
                                <>
                                  <button
                                    onClick={() => handleOpenEditRecount(r)}
                                    className="px-2 py-1 text-[10px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-[var(--color-text)] transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleSubmitRecountCommit(r.id)}
                                    className="px-2 py-1 text-[10px] font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                                    disabled={submitRecount.isPending}
                                  >
                                    Submit
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedRecountId(r.id)
                                    setIsViewModalOpen(true)
                                  }}
                                  className="px-2 py-1 text-[10px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-[var(--color-text)] transition-colors flex items-center gap-1"
                                >
                                  <Eye className="h-3 w-3" />
                                  View Items
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-16 text-center">
                <ClipboardPaste className="h-10 w-10 text-[var(--color-border)] mx-auto mb-4" />
                <h3 className="text-sm font-bold text-[var(--color-text)] mb-2">No Audits Recorded</h3>
                <p className="text-xs text-[var(--color-muted)] max-w-md mx-auto leading-relaxed mb-6">
                  {machines && machines.length > 0
                    ? "You haven't created any audit sheets yet. Click 'Create Recount Sheet' above to begin auditing your enamel dies."
                    : "Create one or more enamel machines under 'Live Machine Stock' first to write audit sheets."}
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal - Manage Enamel Machines List */}
      <AnimatePresence>
        {isManageMachinesOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider font-heading flex items-center gap-2">
                  <Settings className="h-4 w-4 text-blue-400" />
                  Manage Enamel Machines
                </h3>
                <button
                  onClick={() => setIsManageMachinesOpen(false)}
                  className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {/* Form to Add */}
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-3.5 space-y-3">
                  <div className="text-[10px] uppercase font-mono font-bold text-[var(--color-muted)]">Add New Enamel Machine</div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Machine Name (e.g. Enamel Line 1)"
                      value={newMachineName}
                      onChange={(e) => setNewMachineName(e.target.value)}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Description (Optional)"
                      value={newMachineDesc}
                      onChange={(e) => setNewMachineDesc(e.target.value)}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateEnamelMachine}
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
                  >
                    Add Machine
                  </button>
                </div>

                {/* Machines List */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  <div className="text-[10px] uppercase font-mono font-bold text-[var(--color-muted)] mb-1">Configured Enamel Machines</div>
                  {machines && machines.length > 0 ? (
                    machines.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs"
                      >
                        <div>
                          <div className="font-bold text-[var(--color-text)]">{m.name}</div>
                          {m.description && <div className="text-[10px] text-[var(--color-muted)]">{m.description}</div>}
                        </div>
                        <button
                          onClick={() => handleDeleteEnamelMachine(m.id)}
                          className="p-1 rounded text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-[var(--color-muted)] text-xs font-sans">
                      No enamel machines defined yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setIsManageMachinesOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal - Create/Edit Recount Sheet */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                  {recountId ? 'Edit Recount Sheet (Draft)' : 'Create Recount Sheet'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {/* Meta Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold text-[var(--color-muted)] mb-1">Sheet Name</label>
                    <input
                      type="text"
                      value={recountName}
                      onChange={(e) => setRecountName(e.target.value)}
                      placeholder="e.g. August 2026 Count"
                      className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold text-[var(--color-muted)] mb-1">Enamel Machine</label>
                    <select
                      value={recountMachineId || ''}
                      onChange={(e) => setRecountMachineId(Number(e.target.value))}
                      disabled={!!recountId} // Lock machine for edit to avoid baseline swap confusion
                      className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:border-blue-500 focus:outline-none disabled:opacity-50"
                    >
                      {machines?.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono font-bold text-[var(--color-muted)] mb-1">Date</label>
                    <input
                      type="date"
                      value={recountDate}
                      onChange={(e) => setRecountDate(e.target.value)}
                      className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Baseline prefill option (only for Create) */}
                {!recountId && (
                  <button
                    type="button"
                    onClick={handleLoadBaselineFromStock}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded bg-blue-600/10 border border-blue-500/30 text-blue-300 hover:bg-blue-600/20 transition-colors"
                  >
                    <Database className="h-3.5 w-3.5" />
                    Load current stocks as baseline prefill
                  </button>
                )}

                {/* Input Mode Selector */}
                <div className="flex border-b border-[var(--color-border)] mb-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setInputMode('single')}
                    className={`flex items-center gap-1 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                      inputMode === 'single'
                        ? 'border-blue-500 text-blue-400 font-bold'
                        : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    Single Size Input
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('bulk')}
                    className={`flex items-center gap-1 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                      inputMode === 'bulk'
                        ? 'border-blue-500 text-blue-400 font-bold'
                        : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    Bulk Paste Data
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('excel')}
                    className={`flex items-center gap-1 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                      inputMode === 'excel'
                        ? 'border-blue-500 text-blue-400 font-bold'
                        : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    Import Excel / CSV
                  </button>
                </div>

                {inputMode === 'single' && (
                  /* Add Item Row Input */
                  <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-3">
                    <div className="text-[10px] uppercase font-mono font-bold text-[var(--color-muted)] mb-2">Add or Update Tally</div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Die Size (mm or inch)"
                          value={newSize}
                          onChange={(e) => setNewSize(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddRecountItem()
                            }
                          }}
                          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text)] font-mono focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          placeholder="Qty"
                          value={newQty}
                          onChange={(e) => setNewQty(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddRecountItem()
                            }
                          }}
                          min={0}
                          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text)] text-center font-mono focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddRecountItem}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {inputMode === 'bulk' && (
                  /* Bulk Paste Input */
                  <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-3 space-y-3">
                    <div className="text-[10px] uppercase font-mono font-bold text-[var(--color-muted)]">Bulk Import Recount Data</div>
                    <textarea
                      placeholder="Paste size + quantity pairs (e.g. from Excel, tab or space-separated):&#10;0.620  4&#10;0.625  2"
                      value={bulkRecountText}
                      onChange={(e) => setBulkRecountText(e.target.value)}
                      className="w-full h-24 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--color-text)] focus:border-blue-500 focus:outline-none resize-none placeholder:text-slate-600"
                    />
                    <div className="flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleImportBulkRecount(true)}
                        disabled={!bulkRecountText.trim()}
                        className="px-3 py-1.5 rounded-lg bg-blue-600/10 border border-blue-500/30 text-blue-300 hover:bg-blue-600/20 text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        Merge & Update
                      </button>
                      <button
                        type="button"
                        onClick={() => handleImportBulkRecount(false)}
                        disabled={!bulkRecountText.trim()}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        Overwrite All
                      </button>
                    </div>
                  </div>
                )}

                {inputMode === 'excel' && (
                  /* Excel Import Input */
                  <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-5 space-y-4">
                    <div className="text-[10px] uppercase font-mono font-bold text-[var(--color-muted)]">Upload Spreadsheet (.xlsx, .xls, .csv)</div>
                    <div className="border-2 border-dashed border-[var(--color-border)] hover:border-blue-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors relative">
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleExcelImport}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <FileSpreadsheet className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                      <div className="text-xs font-semibold text-[var(--color-text)] mb-1">Click or drag spreadsheet file here to upload</div>
                      <p className="text-[10px] text-[var(--color-muted)]">Supports Excel (.xlsx, .xls) and CSV files</p>
                    </div>
                    <div className="bg-[var(--color-surface)]/50 border border-[var(--color-border)]/60 rounded-lg p-3 text-[10px] text-[var(--color-muted)] leading-relaxed">
                      <strong>Required Format:</strong> The sheet must have die sizes in the first column (e.g. <code>0.620</code> or <code>16.00</code>) and quantities in the second column. Headers like "Size" or "Quantity" are automatically detected and skipped.
                    </div>
                  </div>
                )}

                {/* Items Grid */}
                <div className="border border-[var(--color-border)] rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--color-bg)]/60 border-b border-[var(--color-border)] font-mono text-[9px] text-[var(--color-muted)] uppercase tracking-wider">
                        <th className="py-2.5 px-3 font-semibold">Die Size (mm)</th>
                        <th className="py-2.5 px-3 text-center font-semibold">Quantity</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]/60 font-mono">
                      {recountItems.map((item, idx) => (
                        <tr key={item.die_size} className="hover:bg-slate-900/10">
                          <td className="py-2 px-3 font-bold text-[var(--color-text)]">{item.die_size}</td>
                          <td className="py-2 px-3 text-center font-bold text-[var(--color-text)]">{item.quantity}</td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveRecountItem(idx)}
                              className="p-1 rounded text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {recountItems.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-[var(--color-muted)] font-sans">
                            No tallies recorded. Add a size size/qty above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRecount}
                  disabled={createRecount.isPending || updateRecount.isPending}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  {createRecount.isPending || updateRecount.isPending ? 'Saving...' : 'Save Draft'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal - View Recount Details (Submitted / Read Only) */}
      <AnimatePresence>
        {isViewModalOpen && selectedRecountId && (
          <RecountViewModal
            recountId={selectedRecountId}
            onClose={() => {
              setIsViewModalOpen(false)
              setSelectedRecountId(undefined)
            }}
          />
        )}
      </AnimatePresence>

    </div>
  )
}

// Subcomponent to view recount sheet details (keeps parent component code smaller and clean)
function RecountViewModal({ recountId, onClose }: { recountId: number; onClose: () => void }) {
  const { data: recount, isLoading } = useDieInventoryRecount(recountId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl max-w-md w-full max-h-[75vh] flex flex-col"
      >
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
            View Recount Items
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 rounded" />
              <Skeleton className="h-24 rounded" />
            </div>
          ) : recount ? (
            <>
              {/* Header Stats */}
              <div className="bg-[var(--color-bg)] rounded-lg p-3.5 border border-[var(--color-border)] space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Audit Name:</span>
                  <span className="font-bold text-[var(--color-text)]">{recount.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Enamel Machine:</span>
                  <span className="font-bold text-[var(--color-text)]">{recount.enamel_machine_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Audit Date:</span>
                  <span className="font-mono text-[var(--color-text)]">{recount.recount_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Audited By:</span>
                  <span className="font-bold text-[var(--color-text)]">{recount.created_by_username}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-bg)]/60 border-b border-[var(--color-border)] font-mono text-[9px] text-[var(--color-muted)] uppercase tracking-wider">
                      <th className="py-2.5 px-3 font-semibold">Die Size (mm)</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Audited Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]/60 font-mono">
                    {recount.items?.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-900/10">
                        <td className="py-2 px-3 font-bold text-[var(--color-text)]">{item.die_size}</td>
                        <td className="py-2 px-3 text-right font-black text-blue-400">{item.quantity}</td>
                      </tr>
                    ))}
                    {(!recount.items || recount.items.length === 0) && (
                      <tr>
                        <td colSpan={2} className="py-6 text-center text-[var(--color-muted)] font-sans">
                          No items registered on this audit sheet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-xs text-rose-400">Failed to load recount sheet details.</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors animate-in"
          >
            Close
          </button>
        </div>
      </motion.div>
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