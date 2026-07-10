import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../contexts/AuthContext'
import { useAnnouncer } from '../../../contexts/AccessibilityContext'
import { useApi } from '../../../hooks/useApi'
import { useDebounce } from '../../../hooks/useDebounce'
import { useToast } from '../../../contexts/ToastContext'
import { useInventoryMutations } from './useInventoryMutations'
import { MachineSidebarTreeRef } from '../components/MachineSidebarTree'

export function useInventoryState() {
  const { request } = useApi()
  const { role } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100000)
  
  // Search parameters states initialized from URL if present
  const [q, setQ] = useState(searchParams.get('q') || '')
  const debouncedQ = useDebounce(q, 300)
  const [dieType, setDieType] = useState(searchParams.get('die_type') || '')
  const [statusVal, setStatusVal] = useState(searchParams.get('status') || '')
  const [casing, setCasing] = useState(searchParams.get('casing') || '')
  
  // Custom ranges
  const [sizeMin, setSizeMin] = useState(searchParams.get('size_min') || '')
  const [sizeMax, setSizeMax] = useState(searchParams.get('size_max') || '')
  const [widthMin, setWidthMin] = useState(searchParams.get('width_min') || '')
  const [widthMax, setWidthMax] = useState(searchParams.get('width_max') || '')
  const [thickMin, setThickMin] = useState(searchParams.get('thick_min') || '')
  const [thickMax, setThickMax] = useState(searchParams.get('thick_max') || '')
  
  const [showFilters, setShowFilters] = useState(!!(
    searchParams.get('die_type') || 
    searchParams.get('status') || 
    searchParams.get('casing') || 
    searchParams.get('size_min') || 
    searchParams.get('size_max') || 
    searchParams.get('width_min') || 
    searchParams.get('width_max') || 
    searchParams.get('thick_min') || 
    searchParams.get('thick_max')
  ))
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const hasActiveFilter = !!(debouncedQ || dieType || statusVal || casing || sizeMin || sizeMax || widthMin || widthMax || thickMin || thickMax)

  useEffect(() => {
    setPage(1)
  }, [debouncedQ, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax])

  const [sortField, setSortField] = useState<string>('relevance')
  const [sortOrder, setSortOrder] = useState<string>('asc')

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // Fetch list of sets for the dropdown
  const { data: setsList } = useQuery({
    queryKey: ['setsDropdownList'],
    queryFn: () => request('/api/sets/')
  })

  // Fetch list of machines
  const { data: machinesList } = useQuery({
    queryKey: ['machinesList'],
    queryFn: () => request('/api/machines/')
  })

  const [createError, setCreateError] = useState<string | null>(null)

  // React Query Fetcher
  const { data: searchData, isLoading, error } = useQuery({
    queryKey: ['dies', debouncedQ, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, String(page), String(pageSize)],
    queryFn: ({ signal }: { signal: AbortSignal }) => {
      let url = '/api/go/search'
      const params = new URLSearchParams()
      
      if (debouncedQ) params.append('q', debouncedQ)
      if (dieType) params.append('die_type', dieType)
      if (statusVal) params.append('status', statusVal)
      if (casing) params.append('casing', casing)
      
      if (sizeMin) params.append('size_min', sizeMin)
      if (sizeMax) params.append('size_max', sizeMax)
      if (widthMin) params.append('width_min', widthMin)
      if (widthMax) params.append('width_max', widthMax)
      if (thickMin) params.append('thick_min', thickMin)
      if (thickMax) params.append('thick_max', thickMax)
      params.append('limit', String(pageSize))
      params.append('offset', String((page - 1) * pageSize))
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }
      return request(url, { signal, keepMetadata: true })
    }
  })

  const announce = useAnnouncer()

  useEffect(() => {
    if (searchData) {
      const count = searchData.results?.length ?? 0
      announce(`Search results updated. Showing ${count} matching dies.`)
    }
  }, [searchData])

  const rawDies = searchData?.results || []
  const sortedDies = useMemo(() => {
    if (sortField === 'relevance') {
      return rawDies
    }
    return [...rawDies].sort((a, b) => {
      let valA = a[sortField] || ''
      let valB = b[sortField] || ''
      
      if (sortField === 'category') {
        valA = a.die_type || ''
        valB = b.die_type || ''
      }
      
      if (sortField === 'current_size') {
        valA = a.die_type === 'ROUND' ? parseFloat(a.current_size || 0) : parseFloat(a.current_width || 0)
        valB = b.die_type === 'ROUND' ? parseFloat(b.current_size || 0) : parseFloat(b.current_width || 0)
      }
      
      if (typeof valA === 'string') {
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA)
      } else {
        return sortOrder === 'asc' ? valA - valB : valB - valA
      }
    })
  }, [rawDies, sortField, sortOrder])

  const dies = sortedDies
  const totalCount = searchData?.total ?? dies.length

  // Hook up custom mutations hook:
  const {
    createDieMutation,
    moveDieLocationMutation,
    reallocateDieMutation,
    reallocateSetMutation
  } = useInventoryMutations(setIsCreateOpen, setCreateError)

  const [activeDragType, setActiveDragType] = useState<string | null>(null)

  const handleDragStartDie = (id: string) => {
    setActiveDragType('die')
  }

  const handleDragEndDie = () => {
    setActiveDragType(null)
  }

  const handleCreateSubmit = (payload: any) => {
    setCreateError(null)
    createDieMutation.mutate(payload)
  }

  const [selectedNode, setSelectedNode] = useState<{ type: string; id?: any; machineId?: any } | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const isSearchActive = useMemo(() => {
    return !!(q || dieType || statusVal || casing || sizeMin || sizeMax || widthMin || widthMax || thickMin || thickMax)
  }, [q, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax])

  useEffect(() => {
    if (isSearchActive) {
      setSelectedNode({ type: 'search' })
    } else {
      setSelectedNode(null)
    }
  }, [isSearchActive])

  const { unassignedDies, machinesWithData } = useMemo(() => {
    const diesBySet: Record<string | number, any[]> = {}
    const unassignedDies: any[] = []
    
    dies?.forEach((die: any) => {
      if (die.current_set) {
        if (!diesBySet[die.current_set]) {
          diesBySet[die.current_set] = []
        }
        diesBySet[die.current_set].push(die)
      } else {
        unassignedDies.push(die)
      }
    })

    const setsByMachine: Record<string | number, any[]> = {}
    setsList?.forEach((set: any) => {
      if (set.machine) {
        if (!setsByMachine[set.machine]) {
          setsByMachine[set.machine] = []
        }
        setsByMachine[set.machine].push(set)
      }
    })

    const machinesWithData = (machinesList || []).map((machine: any) => {
      const setsForMachine = setsByMachine[machine.id] || []
      const machineSets = setsForMachine.map((set: any) => {
        const setDies = diesBySet[set.id] || []
        return {
          ...set,
          dies: setDies
        }
      })

      return {
        ...machine,
        sets: machineSets,
        totalDies: machineSets.reduce((sum: number, s: any) => sum + s.dies.length, 0)
      }
    })

    return { unassignedDies, machinesWithData }
  }, [dies, machinesList, setsList])

  useEffect(() => {
    if (!selectedNode && !isSearchActive) {
      if (machinesWithData && machinesWithData.length > 0) {
        setSelectedNode({ type: 'machine', id: machinesWithData[0].id })
      } else if (unassignedDies && unassignedDies.length > 0) {
        setSelectedNode({ type: 'unassigned' })
      }
    }
  }, [machinesWithData, unassignedDies, selectedNode, isSearchActive])

  const activeView = useMemo(() => {
    if (isSearchActive && (!selectedNode || selectedNode.type === 'search')) {
      return 'search'
    }
    if (selectedNode) {
      return selectedNode.type
    }
    return 'placeholder'
  }, [selectedNode, isSearchActive])

  const selectedMachine = useMemo(() => {
    if (selectedNode?.type === 'machine') {
      return machinesWithData.find((m: any) => m.id === selectedNode.id)
    }
    return null
  }, [selectedNode, machinesWithData])

  const selectedSetData = useMemo(() => {
    if (selectedNode?.type === 'set') {
      for (const m of machinesWithData) {
        const s = m.sets.find((set: any) => set.id === selectedNode.id)
        if (s) {
          return { set: s, machine: m }
        }
      }
    }
    return null
  }, [selectedNode, machinesWithData])

  const rawMachine = useMemo(() => {
    if (selectedNode?.type === 'machine') {
      return (machinesList || []).find((m: any) => m.id === selectedNode.id)
    }
    return null
  }, [selectedNode, machinesList])

  const rawSetData = useMemo(() => {
    if (selectedNode?.type === 'set') {
      const s = (setsList || []).find((set: any) => set.id === selectedNode.id)
      if (s) {
        const m = (machinesList || []).find((mach: any) => mach.id === s.machine)
        return { set: s, machine: m }
      }
    }
    return null
  }, [selectedNode, setsList, machinesList])

  const activeDiesList = useMemo(() => {
    if (activeView === 'search') return dies || []
    if (activeView === 'machine') return selectedMachine?.sets.reduce((acc: any[], s: any) => [...acc, ...s.dies], []) || []
    if (activeView === 'set') return selectedSetData?.set.dies || []
    if (activeView === 'unassigned') return unassignedDies || []
    return []
  }, [activeView, dies, selectedMachine, selectedSetData, unassignedDies])

  const canCreate = role === 'ROOT' || role === 'ADMIN'
  const sidebarRef = useRef<MachineSidebarTreeRef>(null)

  const handleExpandAll = () => {
    sidebarRef.current?.expandAll()
  }

  const handleCollapseAll = () => {
    sidebarRef.current?.collapseAll()
  }

  const handleExportCSV = () => {
    const listToExport = activeDiesList
    if (!listToExport || listToExport.length === 0) {
      showToast('No dies to export.', 'error')
      return
    }

    const headers = [
      'Die ID',
      'Type',
      'Casing',
      'Status',
      'Location',
      'Assigned Set',
      'Current Size (mm)',
      'Punched Size (mm)',
      'Current Width (mm)',
      'Punched Width (mm)',
      'Current Thickness (mm)',
      'Punched Thickness (mm)',
      'Radius (mm)',
      'Remarks'
    ]

    const rows = listToExport.map((die: any) => {
      const isRound = die.die_type === 'ROUND'
      return [
        die.die_id || '',
        die.die_type || '',
        die.casing || '',
        die.status || '',
        die.location || '',
        die.set_name || '',
        isRound ? (die.current_size || '') : '',
        isRound ? (die.punched_size || '') : '',
        !isRound ? (die.current_width || '') : '',
        !isRound ? (die.punched_width || '') : '',
        !isRound ? (die.current_thickness || '') : '',
        !isRound ? (die.punched_thickness || '') : '',
        !isRound ? (die.radius || '') : '',
        die.remarks ? `"${String(die.remarks).replace(/"/g, '""')}"` : ''
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any) => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `die_inventory_${activeView}_${dateStr}.csv`
    
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast(`Successfully exported ${listToExport.length} dies to CSV.`, 'success')
  }

  return {
    q,
    setQ,
    dieType,
    setDieType,
    statusVal,
    setStatusVal,
    casing,
    setCasing,
    sizeMin,
    setSizeMin,
    sizeMax,
    setSizeMax,
    widthMin,
    setWidthMin,
    widthMax,
    setWidthMax,
    thickMin,
    setThickMin,
    thickMax,
    setThickMax,
    showFilters,
    setShowFilters,
    isCreateOpen,
    setIsCreateOpen,
    hasActiveFilter,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    handleSort,
    setsList,
    machinesList,
    createError,
    setCreateError,
    isLoading,
    error,
    dies,
    totalCount,
    activeDragType,
    setActiveDragType,
    handleDragStartDie,
    handleDragEndDie,
    handleCreateSubmit,
    selectedNode,
    setSelectedNode,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isSidebarOpen,
    setIsSidebarOpen,
    isSearchActive,
    unassignedDies,
    machinesWithData,
    activeView,
    selectedMachine,
    selectedSetData,
    rawMachine,
    rawSetData,
    activeDiesList,
    canCreate,
    sidebarRef,
    handleExpandAll,
    handleCollapseAll,
    handleExportCSV,
    viewMode,
    setViewMode,
    navigate,
    createDieMutation,
    moveDieLocationMutation,
    reallocateDieMutation,
    reallocateSetMutation,
    page,
    setPage,
    pageSize,
    setPageSize
  }
}
