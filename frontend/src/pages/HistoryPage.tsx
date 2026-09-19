import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '../hooks/useApi'
import { useDebounce } from '../hooks/useDebounce'
import { Search, User, Filter, ArrowLeft, ArrowRight, Download, Layers, Activity } from 'lucide-react'

interface HistoryItem {
  id: string | number
  entity_type: string
  entity_id: number
  entity_name: string
  action: string
  field_name: string
  old_value: string
  new_value: string
  changed_by_username: string
  timestamp: string
  ip_address: string
  note?: string
}

interface DieHistoryItem {
  id: string | number
  die_id: string
  field_name: string
  old_value: string
  new_value: string
  changed_by_username: string
  timestamp: string
  ip_address: string
  note?: string
}

interface HistoryApiResponse<T> {
  results: T[]
  count: number
}

interface GroupedTransaction {
  key: string
  changed_by_username: string
  timestamp: string
  ip_address: string
  entity_type: string
  entity_name: string
  action: string
  note: string
  changes: {
    field_name: string
    old_value: string
    new_value: string
  }[]
}

function groupHistoryItems(items: HistoryItem[]): GroupedTransaction[] {
  const groups: GroupedTransaction[] = []

  items.forEach((item) => {
    const timestampMs = new Date(item.timestamp).getTime()

    // Find if there is an existing group for this entity + user + IP within a 5-second window
    const matchingGroup = groups.find((g) => {
      if (g.changed_by_username !== item.changed_by_username) return false
      if (g.entity_name !== item.entity_name) return false
      if (g.entity_type !== item.entity_type) return false
      if (g.ip_address !== item.ip_address) return false

      const groupTimeMs = new Date(g.timestamp).getTime()
      return Math.abs(groupTimeMs - timestampMs) <= 5000
    })

    if (matchingGroup) {
      if (item.field_name && !matchingGroup.changes.some((c) => c.field_name === item.field_name)) {
        matchingGroup.changes.push({
          field_name: item.field_name,
          old_value: item.old_value,
          new_value: item.new_value,
        })
      }
      if (item.note && !matchingGroup.note) {
        matchingGroup.note = item.note
      }
    } else {
      groups.push({
        key: String(item.id),
        changed_by_username: item.changed_by_username,
        timestamp: item.timestamp,
        ip_address: item.ip_address,
        entity_type: item.entity_type,
        entity_name: item.entity_name,
        action: item.action,
        note: item.note || '',
        changes: item.field_name
          ? [
              {
                field_name: item.field_name,
                old_value: item.old_value,
                new_value: item.new_value,
              },
            ]
          : [],
      })
    }
  })

  return groups
}

function renderDiffValue(oldVal: string, newVal: string) {
  if (!oldVal && newVal) {
    return (
      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[11px] font-mono">
        Added: {newVal}
      </span>
    )
  }
  if (oldVal && !newVal) {
    return (
      <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[11px] font-mono">
        Cleared ({oldVal})
      </span>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
      <span className="bg-[var(--color-bg)] px-2 py-0.5 rounded text-red-400 line-through border border-[var(--color-border)]">
        {oldVal || 'empty'}
      </span>
      <span className="text-[var(--color-muted)]">➔</span>
      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
        {newVal || 'empty'}
      </span>
    </div>
  )
}

export function HistoryPage() {
  const { request } = useApi()
  const [activeTab, setActiveTab] = useState<'timeline' | 'dies' | 'machines'>('timeline')

  // Shared Filter States
  const [userInput, setUserInput] = useState('')
  const [fieldInput, setFieldInput] = useState('')
  const [ipInput, setIpInput] = useState('')
  const [searchTextInput, setSearchTextInput] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)

  // Die Filter States
  const [dieIdInput, setDieIdInput] = useState('')

  // Machine Filter States
  const [entityNameInput, setEntityNameInput] = useState('')
  const [entityTypeInput, setEntityTypeInput] = useState('')
  const [actionInput, setActionInput] = useState('')

  // Debounced filters
  const debouncedUser = useDebounce(userInput, 300)
  const debouncedField = useDebounce(fieldInput, 300)
  const debouncedIp = useDebounce(ipInput, 300)
  const debouncedSearchText = useDebounce(searchTextInput, 300)
  const debouncedDieId = useDebounce(dieIdInput, 300)
  const debouncedEntityName = useDebounce(entityNameInput, 300)

  // Fetch Unified History
  const {
    data: unifiedHistoryData,
    isLoading: isLoadingUnified,
    error: errorUnified,
  } = useQuery({
    queryKey: [
      'unifiedHistory',
      debouncedUser,
      debouncedField,
      debouncedIp,
      debouncedSearchText,
      fromDate,
      toDate,
      page,
    ],
    enabled: activeTab === 'timeline',
    queryFn: ({ signal }) => {
      const params = new URLSearchParams()
      if (debouncedUser) params.append('user', debouncedUser)
      if (debouncedField) params.append('field', debouncedField)
      if (debouncedIp) params.append('ip', debouncedIp)
      if (debouncedSearchText) params.append('search', debouncedSearchText)
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)
      params.append('page', page.toString())
      params.append('page_size', '40')

      return request(`/api/history/unified/?${params.toString()}`, { signal, keepMetadata: true })
    },
  })

  // Fetch Die History
  const {
    data: dieHistoryData,
    isLoading: isLoadingDies,
    error: errorDies,
  } = useQuery({
    queryKey: [
      'dieHistory',
      debouncedDieId,
      debouncedUser,
      debouncedField,
      debouncedIp,
      debouncedSearchText,
      fromDate,
      toDate,
      page,
    ],
    enabled: activeTab === 'dies',
    queryFn: ({ signal }) => {
      const params = new URLSearchParams()
      if (debouncedDieId) params.append('die_id', debouncedDieId)
      if (debouncedUser) params.append('user', debouncedUser)
      if (debouncedField) params.append('field', debouncedField)
      if (debouncedIp) params.append('ip', debouncedIp)
      if (debouncedSearchText) params.append('search', debouncedSearchText)
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)
      params.append('page', page.toString())
      params.append('page_size', '25')

      return request(`/api/history/?${params.toString()}`, { signal, keepMetadata: true })
    },
  })

  // Fetch Machine History
  const {
    data: machineHistoryData,
    isLoading: isLoadingMachines,
    error: errorMachines,
  } = useQuery({
    queryKey: [
      'machineHistory',
      debouncedEntityName,
      entityTypeInput,
      actionInput,
      debouncedUser,
      debouncedField,
      debouncedIp,
      debouncedSearchText,
      fromDate,
      toDate,
      page,
    ],
    enabled: activeTab === 'machines',
    queryFn: ({ signal }) => {
      const params = new URLSearchParams()
      if (debouncedEntityName) params.append('entity_name', debouncedEntityName)
      if (entityTypeInput) params.append('entity_type', entityTypeInput)
      if (actionInput) params.append('action', actionInput)
      if (debouncedUser) params.append('user', debouncedUser)
      if (debouncedField) params.append('field', debouncedField)
      if (debouncedIp) params.append('ip', debouncedIp)
      if (debouncedSearchText) params.append('search', debouncedSearchText)
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)
      params.append('page', page.toString())
      params.append('page_size', '25')

      return request(`/api/history/machines/?${params.toString()}`, { signal, keepMetadata: true })
    },
  })

  const handleTabChange = (tab: 'timeline' | 'dies' | 'machines') => {
    setActiveTab(tab)
    setPage(1)
    setUserInput('')
    setFieldInput('')
    setIpInput('')
    setSearchTextInput('')
    setFromDate('')
    setToDate('')
    setDieIdInput('')
    setEntityNameInput('')
    setEntityTypeInput('')
    setActionInput('')
  }

  const isCurrentLoading =
    activeTab === 'timeline' ? isLoadingUnified : activeTab === 'dies' ? isLoadingDies : isLoadingMachines
  const currentError =
    activeTab === 'timeline' ? errorUnified : activeTab === 'dies' ? errorDies : errorMachines
  const currentList =
    activeTab === 'timeline'
      ? unifiedHistoryData?.results || []
      : activeTab === 'dies'
      ? dieHistoryData?.results || []
      : machineHistoryData?.results || []
  const count =
    activeTab === 'timeline'
      ? unifiedHistoryData?.count || 0
      : activeTab === 'dies'
      ? dieHistoryData?.count || 0
      : machineHistoryData?.count || 0
  const totalPages = Math.ceil(count / (activeTab === 'timeline' ? 40 : 25))

  // CSV Export
  const exportToCSV = async () => {
    try {
      const params = new URLSearchParams()
      if (debouncedUser) params.append('user', debouncedUser)
      if (debouncedField) params.append('field', debouncedField)
      if (debouncedIp) params.append('ip', debouncedIp)
      if (debouncedSearchText) params.append('search', debouncedSearchText)
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)
      params.append('page_size', '10000')

      if (activeTab === 'timeline') {
        const res = await request<HistoryApiResponse<HistoryItem>>(`/api/history/unified/?${params.toString()}`, { keepMetadata: true })
        const allResults = res?.results || []

        let csvContent =
          'Timestamp,Entity Type,Entity ID,Entity Name,Action,Field Changed,Old Value,New Value,Changed By,IP Address,Note\n'
        allResults.forEach((h: HistoryItem) => {
          const timestamp = h.timestamp ? new Date(h.timestamp).toLocaleString() : ''
          const entityType = h.entity_type ?? ''
          const entityId = h.entity_id ?? ''
          const entityName = h.entity_name ?? ''
          const action = h.action ?? ''
          const fieldName = h.field_name ?? ''
          const oldValue = `"${(h.old_value ?? '').replace(/"/g, '""')}"`
          const newValue = `"${(h.new_value ?? '').replace(/"/g, '""')}"`
          const changedBy = h.changed_by_username ?? 'System'
          const ipAddress = h.ip_address ?? ''
          const note = `"${(h.note ?? '').replace(/"/g, '""')}"`
          csvContent += `${timestamp},${entityType},${entityId},${entityName},${action},${fieldName},${oldValue},${newValue},${changedBy},${ipAddress},${note}\n`
        })

        triggerCSVDownload(csvContent, `dms_unified_history_${Date.now()}.csv`)
      } else if (activeTab === 'dies') {
        if (debouncedDieId) params.append('die_id', debouncedDieId)
        const res = await request<HistoryApiResponse<DieHistoryItem>>(`/api/history/?${params.toString()}`, { keepMetadata: true })
        const allResults = res?.results || []

        let csvContent = 'Timestamp,Die ID,Field Changed,Old Value,New Value,Changed By,IP Address,Note\n'
        allResults.forEach((h: DieHistoryItem) => {
          const timestamp = h.timestamp ? new Date(h.timestamp).toLocaleString() : ''
          const dieId = h.die_id ?? ''
          const fieldName = h.field_name ?? ''
          const oldValue = `"${(h.old_value ?? '').replace(/"/g, '""')}"`
          const newValue = `"${(h.new_value ?? '').replace(/"/g, '""')}"`
          const changedBy = h.changed_by_username ?? 'System'
          const ipAddress = h.ip_address ?? ''
          const note = `"${(h.note ?? '').replace(/"/g, '""')}"`
          csvContent += `${timestamp},${dieId},${fieldName},${oldValue},${newValue},${changedBy},${ipAddress},${note}\n`
        })

        triggerCSVDownload(csvContent, `dms_die_history_${Date.now()}.csv`)
      } else {
        if (debouncedEntityName) params.append('entity_name', debouncedEntityName)
        if (entityTypeInput) params.append('entity_type', entityTypeInput)
        if (actionInput) params.append('action', actionInput)

        const res = await request<HistoryApiResponse<HistoryItem>>(`/api/history/machines/?${params.toString()}`, { keepMetadata: true })
        const allResults = res?.results || []

        let csvContent =
          'Timestamp,Entity Type,Entity ID,Entity Name,Action,Field Changed,Old Value,New Value,Changed By,IP Address\n'
        allResults.forEach((h: HistoryItem) => {
          const timestamp = h.timestamp ? new Date(h.timestamp).toLocaleString() : ''
          const entityType = h.entity_type ?? ''
          const entityId = h.entity_id ?? ''
          const entityName = h.entity_name ?? ''
          const action = h.action ?? ''
          const fieldName = h.field_name ?? ''
          const oldValue = `"${(h.old_value ?? '').replace(/"/g, '""')}"`
          const newValue = `"${(h.new_value ?? '').replace(/"/g, '""')}"`
          const changedBy = h.changed_by_username ?? 'System'
          const ipAddress = h.ip_address ?? ''
          csvContent += `${timestamp},${entityType},${entityId},${entityName},${action},${fieldName},${oldValue},${newValue},${changedBy},${ipAddress}\n`
        })

        triggerCSVDownload(csvContent, `dms_machines_history_${Date.now()}.csv`)
      }
    } catch (err) {
      console.error('Failed to export history', err)
    }
  }

  const triggerCSVDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--color-border)] pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)] font-bold uppercase tracking-wider mb-0.5">
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            <span>Audit Journal</span>
          </div>
          <h1 className="text-base md:text-lg font-bold text-[var(--color-text)] uppercase tracking-wide font-heading">
            Facility Audit Trail
          </h1>
          <p className="text-[var(--color-muted)] text-xs mt-0.5">
            Chronological audit log of operations and tooling state changes.
          </p>
        </div>
        <div>
          <button
            type="button"
            disabled={currentList.length === 0}
            onClick={exportToCSV}
            className="flex items-center space-x-1.5 bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] disabled:opacity-40 text-[var(--color-text)] border border-[var(--color-border)] px-3.5 py-2 rounded-xl text-xs font-bold uppercase transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-blue-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)] space-x-4">
        <button
          onClick={() => handleTabChange('timeline')}
          className={`pb-2.5 text-xs font-bold uppercase transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'timeline'
              ? 'border-b-2 border-blue-500 text-blue-400'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <Layers className="h-3.5 w-3.5 text-blue-400" />
          <span>Unified Timeline</span>
        </button>
        <button
          onClick={() => handleTabChange('dies')}
          className={`pb-2.5 text-xs font-bold uppercase transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'dies'
              ? 'border-b-2 border-blue-500 text-blue-400'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Dies Journal</span>
        </button>
        <button
          onClick={() => handleTabChange('machines')}
          className={`pb-2.5 text-xs font-bold uppercase transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'machines'
              ? 'border-b-2 border-blue-500 text-blue-400'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Machines & Sets</span>
        </button>
      </div>

      {/* Filters Grid */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-5 space-y-3 font-mono shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Tab Specific Filter */}
          {activeTab === 'dies' && (
            <div>
              <label className="text-[var(--color-muted)] text-[10px] font-bold uppercase tracking-wider block mb-1">
                Die ID
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-[var(--color-muted)]" />
                <input
                  type="text"
                  placeholder="Search die ID..."
                  value={dieIdInput}
                  onChange={(e) => {
                    setDieIdInput(e.target.value)
                    setPage(1)
                  }}
                  className="pl-7 pr-3 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-xs w-full text-[var(--color-text)] focus:border-blue-500 focus:outline-none uppercase font-mono"
                />
              </div>
            </div>
          )}
          {activeTab === 'machines' && (
            <>
              <div>
                <label className="text-[var(--color-muted)] text-[10px] font-bold uppercase tracking-wider block mb-1">
                  Entity Name
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-[var(--color-muted)]" />
                  <input
                    type="text"
                    placeholder="Search name..."
                    value={entityNameInput}
                    onChange={(e) => {
                      setEntityNameInput(e.target.value)
                      setPage(1)
                    }}
                    className="pl-7 pr-3 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-xs w-full text-[var(--color-text)] focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[var(--color-muted)] text-[10px] font-bold uppercase tracking-wider block mb-1">
                  Entity Type
                </label>
                <select
                  value={entityTypeInput}
                  onChange={(e) => {
                    setEntityTypeInput(e.target.value)
                    setPage(1)
                  }}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-blue-500 uppercase font-mono cursor-pointer"
                >
                  <option value="">All Entities</option>
                  <option value="MACHINE">Machine</option>
                  <option value="SET">Set</option>
                  <option value="CATEGORY">Category</option>
                </select>
              </div>

              <div>
                <label className="text-[var(--color-muted)] text-[10px] font-bold uppercase tracking-wider block mb-1">
                  Action
                </label>
                <select
                  value={actionInput}
                  onChange={(e) => {
                    setActionInput(e.target.value)
                    setPage(1)
                  }}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-blue-500 uppercase font-mono cursor-pointer"
                >
                  <option value="">All Actions</option>
                  <option value="CREATED">Created</option>
                  <option value="UPDATED">Updated</option>
                  <option value="DELETED">Deleted</option>
                </select>
              </div>
            </>
          )}

          {/* Shared Filters */}
          <div>
            <label className="text-[var(--color-muted)] text-[10px] font-bold uppercase tracking-wider block mb-1">
              Changed By
            </label>
            <div className="relative">
              <User className="absolute left-2.5 top-2.5 h-3 w-3 text-[var(--color-muted)]" />
              <input
                type="text"
                placeholder="Username..."
                value={userInput}
                onChange={(e) => {
                  setUserInput(e.target.value)
                  setPage(1)
                }}
                className="pl-7 pr-3 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-xs w-full text-[var(--color-text)] focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[var(--color-muted)] text-[10px] font-bold uppercase tracking-wider block mb-1">
              Field Name
            </label>
            <div className="relative">
              <Filter className="absolute left-2.5 top-2.5 h-3 w-3 text-[var(--color-muted)]" />
              <input
                type="text"
                placeholder="e.g. status..."
                value={fieldInput}
                onChange={(e) => {
                  setFieldInput(e.target.value)
                  setPage(1)
                }}
                className="pl-7 pr-3 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-xs w-full text-[var(--color-text)] focus:border-blue-500 focus:outline-none font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="text-[var(--color-muted)] text-[10px] font-bold uppercase tracking-wider block mb-1">
              IP Address
            </label>
            <div className="relative">
              <Filter className="absolute left-2.5 top-2.5 h-3 w-3 text-[var(--color-muted)]" />
              <input
                type="text"
                placeholder="e.g. 192.168..."
                value={ipInput}
                onChange={(e) => {
                  setIpInput(e.target.value)
                  setPage(1)
                }}
                className="pl-7 pr-3 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-xs w-full text-[var(--color-text)] focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[var(--color-muted)] text-[10px] font-bold uppercase tracking-wider block mb-1">
              Notes / Values
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-[var(--color-muted)]" />
              <input
                type="text"
                placeholder="Search notes or values..."
                value={searchTextInput}
                onChange={(e) => {
                  setSearchTextInput(e.target.value)
                  setPage(1)
                }}
                className="pl-7 pr-3 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl text-xs w-full text-[var(--color-text)] focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-3">
          <div>
            <label className="text-[var(--color-muted)] text-[10px] font-bold uppercase tracking-wider block mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value)
                setPage(1)
              }}
              className="px-3 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-blue-500 rounded-xl text-xs w-full text-[var(--color-text)] font-mono"
            />
          </div>

          <div>
            <label className="text-[var(--color-muted)] text-[10px] font-bold uppercase tracking-wider block mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value)
                setPage(1)
              }}
              className="px-3 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-blue-500 rounded-xl text-xs w-full text-[var(--color-text)] font-mono"
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden font-mono shadow-sm">
        {isCurrentLoading ? (
          <div className="p-12 text-center text-[var(--color-muted)] text-xs">
            <div className="animate-spin h-6 w-6 border-2 border-[var(--color-border)] border-t-blue-500 rounded-full mx-auto mb-2" />
            <p className="uppercase font-bold">Loading audit logs...</p>
          </div>
        ) : currentError ? (
          <div className="p-12 text-center text-red-400 text-xs">
            <p className="uppercase font-bold">Failed to load audit logs.</p>
            <p className="text-[var(--color-muted)] mt-1">{(currentError as Error).message}</p>
          </div>
        ) : currentList.length === 0 ? (
          <div className="p-12 text-center text-[var(--color-muted)] text-xs">
            <p className="uppercase font-bold text-[var(--color-text)]">No Audit Log Records Found</p>
            <p className="mt-1">Try adjusting the filter criteria or check back later.</p>
          </div>
        ) : (
          <>
            {activeTab === 'timeline' ? (
              <div className="p-4 space-y-3 bg-[var(--color-bg)]">
                {groupHistoryItems(currentList).map((group) => (
                  <div
                    key={group.key}
                    className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 font-mono transition hover:border-blue-500/30"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2 border-b border-[var(--color-border)] pb-2">
                      <div>
                        <div className="flex items-center flex-wrap gap-1.5 text-xs">
                          <span className="font-bold text-[var(--color-text)]">
                            {group.changed_by_username}
                          </span>
                          <span className="text-[var(--color-muted)]">MODIFIED</span>
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-bold rounded border uppercase ${
                              group.entity_type === 'DIE'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : group.entity_type === 'MACHINE'
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            {group.entity_type}
                          </span>
                          <span className="font-semibold text-[var(--color-text)]">
                            {group.entity_name}
                          </span>
                        </div>

                        {group.note && (
                          <div className="mt-1 text-[11px] text-[var(--color-muted)] italic bg-[var(--color-bg)] px-2 py-1 rounded border border-[var(--color-border)]">
                            &ldquo;{group.note}&rdquo;
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-[var(--color-muted)] font-mono tabular-nums">
                          {new Date(group.timestamp).toLocaleString()}
                        </div>
                        {group.ip_address && (
                          <div className="text-[9px] text-[var(--color-muted)] font-mono">
                            IP: {group.ip_address}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Changes list */}
                    {group.changes.length > 0 ? (
                      <div className="space-y-1 mt-1">
                        {group.changes.map((change, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs py-0.5"
                          >
                            <span className="font-mono text-[var(--color-muted)] w-32 shrink-0 uppercase text-[10px]">
                              {change.field_name}
                            </span>
                            <div className="flex-1">
                              {renderDiffValue(change.old_value, change.new_value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-[var(--color-muted)] font-mono">
                        ACTION:{' '}
                        <span className="font-bold text-[var(--color-text)] uppercase">
                          {group.action}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--color-border)] text-left text-xs font-mono">
                  <thead className="bg-[var(--color-bg)] text-[var(--color-muted)] uppercase tracking-wider">
                    {activeTab === 'dies' ? (
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Timestamp</th>
                        <th className="px-4 py-2.5 font-semibold">Die ID</th>
                        <th className="px-4 py-2.5 font-semibold">Field Changed</th>
                        <th className="px-4 py-2.5 font-semibold">Old Value</th>
                        <th className="px-4 py-2.5 font-semibold">New Value</th>
                        <th className="px-4 py-2.5 font-semibold">Changed By</th>
                        <th className="px-4 py-2.5 font-semibold">IP Address</th>
                        <th className="px-4 py-2.5 font-semibold">Reason / Note</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Timestamp</th>
                        <th className="px-4 py-2.5 font-semibold">Entity</th>
                        <th className="px-4 py-2.5 font-semibold">Name</th>
                        <th className="px-4 py-2.5 font-semibold">Action</th>
                        <th className="px-4 py-2.5 font-semibold">Field Changed</th>
                        <th className="px-4 py-2.5 font-semibold">Old Value</th>
                        <th className="px-4 py-2.5 font-semibold">New Value</th>
                        <th className="px-4 py-2.5 font-semibold">Changed By</th>
                        <th className="px-4 py-2.5 font-semibold">IP Address</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text)]">
                    {activeTab === 'dies'
                      ? (currentList as DieHistoryItem[]).map((log: DieHistoryItem) => (
                          <tr key={log.id} className="hover:bg-[var(--color-surface-2)] transition">
                            <td className="px-4 py-2.5 whitespace-nowrap text-[var(--color-muted)] tabular-nums">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-blue-400 font-bold font-mono">
                              {log.die_id}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap font-mono text-[var(--color-muted)] uppercase">
                              {log.field_name}
                            </td>
                            <td
                              className="px-4 py-2.5 max-w-xs truncate text-red-400"
                              title={log.old_value}
                            >
                              {log.old_value || (
                                <span className="text-[var(--color-muted)] italic">empty</span>
                              )}
                            </td>
                            <td
                              className="px-4 py-2.5 max-w-xs truncate text-emerald-400"
                              title={log.new_value}
                            >
                              {log.new_value || (
                                <span className="text-[var(--color-muted)] italic">empty</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-[var(--color-text)] font-bold">
                              {log.changed_by_username || 'System'}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap font-mono text-[var(--color-muted)]">
                              {log.ip_address || '—'}
                            </td>
                            <td
                              className="px-4 py-2.5 text-[var(--color-muted)] max-w-xs truncate"
                              title={log.note}
                            >
                              {log.note || '—'}
                            </td>
                          </tr>
                        ))
                      : (currentList as HistoryItem[]).map((log: HistoryItem) => (
                          <tr key={log.id} className="hover:bg-[var(--color-surface-2)] transition">
                            <td className="px-4 py-2.5 whitespace-nowrap text-[var(--color-muted)] tabular-nums">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span
                                className={`px-1.5 py-0.5 text-[9px] font-bold rounded border uppercase ${
                                  log.entity_type === 'MACHINE'
                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                    : log.entity_type === 'SET'
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                }`}
                              >
                                {log.entity_type}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-[var(--color-text)] font-bold uppercase">
                              {log.entity_name}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span
                                className={`px-1.5 py-0.5 text-[9px] font-mono uppercase rounded ${
                                  log.action === 'CREATED'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : log.action === 'DELETED'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-amber-500/20 text-amber-400'
                                }`}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap font-mono text-[var(--color-muted)] uppercase">
                              {log.field_name || '—'}
                            </td>
                            <td
                              className="px-4 py-2.5 max-w-xs truncate text-red-400"
                              title={log.old_value}
                            >
                              {log.old_value || '—'}
                            </td>
                            <td
                              className="px-4 py-2.5 max-w-xs truncate text-emerald-400"
                              title={log.new_value}
                            >
                              {log.new_value || '—'}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-[var(--color-text)] font-bold">
                              {log.changed_by_username || 'System'}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap font-mono text-[var(--color-muted)]">
                              {log.ip_address || '—'}
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
                <span className="text-xs text-[var(--color-muted)] font-mono tabular-nums">
                  Page <span className="font-bold text-[var(--color-text)]">{page}</span> of{' '}
                  <span className="font-bold text-[var(--color-text)]">{totalPages}</span> ({count}{' '}
                  records)
                </span>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] disabled:opacity-40 text-[var(--color-text)] border border-[var(--color-border)] rounded-lg transition cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] disabled:opacity-40 text-[var(--color-text)] border border-[var(--color-border)] rounded-lg transition cursor-pointer"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
