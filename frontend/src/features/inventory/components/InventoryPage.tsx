import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Search, 
  SlidersHorizontal, 
  Plus, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Menu, 
  Cpu, 
  Layers, 
  Database, 
  Sliders,
  ChevronDown,
  Activity,
  FolderOpen
} from 'lucide-react'
import { useApi, useAuth, useDebounce, isDieActive, useToast } from '../../../App'
import { DiesTable } from './DiesTable'
import { CreateDieModal } from './CreateDieModal'
import { FilterPanel } from './FilterPanel'
import { DieStats } from '../../dashboard/components/DieStats'
import { RackLayoutGrid } from './RackLayoutGrid'
import { Skeleton, TableSkeleton } from '../../../components/Skeleton'
import { EmptyState } from '../../../components/EmptyState'

const mapQueryDataList = (old: any, mapFn: (d: any) => any) => {
  if (!old) return old
  if (Array.isArray(old)) {
    return old.map(mapFn)
  }
  if (old && typeof old === 'object' && Array.isArray(old.results)) {
    return {
      ...old,
      results: old.results.map(mapFn)
    }
  }
  return old
}

export function InventoryPage() {
  const { request } = useApi()
  const { role } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  
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

  // Tree expanded states
  const [expandedMachines, setExpandedMachines] = useState<Record<string | number, boolean>>({})
  const [expandedSets, setExpandedSets] = useState<Record<string | number, boolean>>({})
  const [expandedUnassigned, setExpandedUnassigned] = useState(true)

  const toggleMachine = useCallback((id: any) => {
    setExpandedMachines((prev: Record<string | number, boolean>) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const toggleSet = useCallback((id: any) => {
    setExpandedSets((prev: Record<string | number, boolean>) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const [createError, setCreateError] = useState<string | null>(null)
  const [showEmptyNodes, setShowEmptyNodes] = useState(true)

  // React Query Fetcher
  const { data: searchData, isLoading, error } = useQuery({
    queryKey: ['dies', debouncedQ, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, '10000'],
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
      params.append('limit', '10000')
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }
      return request(url, { signal, keepMetadata: true })
    }
  })

  const dies = searchData?.results || []
  const totalCount = searchData?.total ?? dies.length

  // Create die mutation
  const createDieMutation = useMutation({
    mutationFn: (payload: any) => request('/api/dies/', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
      setIsCreateOpen(false)
    },
    onError: (err: any) => {
      setCreateError(err.message)
    }
  })

  // Mutation for updating die location (visual grid)
  const moveDieLocationMutation = useMutation({
    mutationFn: ({ dieId, location, rack, shelf }: { dieId: string, location?: string, rack?: number | null, shelf?: number | null }) => request(`/api/dies/${dieId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ location, rack, shelf })
    }),
    onMutate: async ({ dieId, location, rack, shelf }: { dieId: string, location?: string, rack?: number | null, shelf?: number | null }) => {
      await queryClient.cancelQueries({ queryKey: ['dies'] })
      await queryClient.cancelQueries({ queryKey: ['searchDies'] })
      const previousDies = queryClient.getQueriesData({ queryKey: ['dies'] })
      const previousSearch = queryClient.getQueriesData({ queryKey: ['searchDies'] })

      const updateLoc = (old: any) => {
        return mapQueryDataList(old, (d: any) => String(d.die_id) === String(dieId) ? { ...d, location: location !== undefined ? location : d.location, rack_id: rack !== undefined ? rack : d.rack_id, shelf: shelf !== undefined ? shelf : d.shelf } : d)
      }
      queryClient.setQueriesData({ queryKey: ['dies'] }, updateLoc)
      queryClient.setQueriesData({ queryKey: ['searchDies'] }, updateLoc)

      return { previousDies, previousSearch }
    },
    onError: (err: any, variables: any, context: any) => {
      if (context) {
        if (context.previousDies) {
          context.previousDies.forEach(([key, val]: any) => queryClient.setQueryData(key, val))
        }
        if (context.previousSearch) {
          context.previousSearch.forEach(([key, val]: any) => queryClient.setQueryData(key, val))
        }
      }
      showToast(`Failed to move die: ${err.message}`, 'error')
    },
    onSuccess: (data: any, variables: any) => {
      showToast(`Successfully moved die ${variables.dieId} to ${variables.location}.`, 'success')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['searchDies'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
    }
  })

  // Drag and Drop State & Handler Hooks
  const [activeDragType, setActiveDragType] = useState<string | null>(null) // 'die' or 'set'
  const [dragOverNode, setDragOverNode] = useState<{ type: string; id?: any } | null>(null) // { type: 'machine'|'set'|'unassigned', id: ... }

  const reallocateDieMutation = useMutation({
    mutationFn: ({ dieId, setId }: { dieId: any, setId: any }) => request(`/api/dies/${dieId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ current_set: setId })
    }),
    onMutate: async ({ dieId, setId }: { dieId: any, setId: any }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['dies'] })
      await queryClient.cancelQueries({ queryKey: ['searchDies'] })
      await queryClient.cancelQueries({ queryKey: ['machinesList'] })
      await queryClient.cancelQueries({ queryKey: ['setsDropdownList'] })

      // Snapshot
      const previousDiesQueries = queryClient.getQueriesData({ queryKey: ['dies'] })
      const previousSearchDiesQueries = queryClient.getQueriesData({ queryKey: ['searchDies'] })
      const previousMachines = queryClient.getQueryData(['machinesList'])
      const previousSets = queryClient.getQueryData(['setsDropdownList'])

      // Find set name if setId is provided
      let newSetName = ''
      if (setId) {
        const sets: any[] = (previousSets as any[]) || []
        const foundSet = sets.find((s: any) => Number(s.id) === Number(setId))
        if (foundSet) {
          newSetName = foundSet.name
        } else if (previousMachines) {
          for (const machine of (previousMachines as any[])) {
            const foundSetInMachine = machine.sets?.find((s: any) => Number(s.id) === Number(setId))
            if (foundSetInMachine) {
              newSetName = foundSetInMachine.name
              break
            }
          }
        }
      }

      // Optimistically update list queries
      const updateCurrentSet = (old: any) => {
        return mapQueryDataList(old, (die: any) => {
          if (String(die.die_id) === String(dieId)) {
            return {
              ...die,
              current_set: setId ? Number(setId) : null,
              current_set_name: newSetName || undefined,
              set_name: newSetName || undefined,
            }
          }
          return die
        })
      }
      queryClient.setQueriesData({ queryKey: ['dies'] }, updateCurrentSet)
      queryClient.setQueriesData({ queryKey: ['searchDies'] }, updateCurrentSet)

      // Optimistically update sets dropdown query
      if (previousSets) {
        queryClient.setQueryData(['setsDropdownList'], (old: any) => {
          if (!Array.isArray(old)) return old
          let foundDie: any = null
          const updatedSets = old.map((set: any) => {
            const hasDie = set.dies?.some((d: any) => String(d.die_id) === String(dieId))
            if (hasDie) {
              foundDie = set.dies.find((d: any) => String(d.die_id) === String(dieId))
              return {
                ...set,
                dies: set.dies.filter((d: any) => String(d.die_id) !== String(dieId))
              }
            }
            return set
          })

          if (!foundDie) {
            for (const [, diesData] of previousDiesQueries) {
              if (Array.isArray(diesData)) {
                foundDie = diesData.find((d: any) => String(d.die_id) === String(dieId))
                if (foundDie) break
              }
            }
          }

          if (foundDie) {
            const updatedDie = {
              ...foundDie,
              current_set: setId ? Number(setId) : null,
              current_set_name: newSetName || undefined,
              set_name: newSetName || undefined,
            }
            return updatedSets.map((set: any) => {
              if (setId && Number(set.id) === Number(setId)) {
                const otherDies = (set.dies || []).filter((d: any) => String(d.die_id) !== String(dieId))
                return {
                  ...set,
                  dies: [...otherDies, updatedDie]
                }
              }
              return set
            })
          }
          return old
        })
      }

      // Optimistically update machines list
      if (previousMachines) {
        queryClient.setQueryData(['machinesList'], (old: any) => {
          if (!Array.isArray(old)) return old
          let foundDie: any = null
          const updatedMachines = old.map((machine: any) => {
            if (!machine.sets) return machine
            const updatedSets = machine.sets.map((set: any) => {
              const hasDie = set.dies?.some((d: any) => String(d.die_id) === String(dieId))
              if (hasDie) {
                foundDie = set.dies.find((d: any) => String(d.die_id) === String(dieId))
                return {
                  ...set,
                  dies: set.dies.filter((d: any) => String(d.die_id) !== String(dieId))
                }
              }
              return set
            })
            return { ...machine, sets: updatedSets }
          })

          if (!foundDie) {
            for (const [, diesData] of previousDiesQueries) {
              if (Array.isArray(diesData)) {
                foundDie = diesData.find((d: any) => String(d.die_id) === String(dieId))
                if (foundDie) break
              }
            }
          }

          if (foundDie) {
            const updatedDie = {
              ...foundDie,
              current_set: setId ? Number(setId) : null,
              current_set_name: newSetName || undefined,
              set_name: newSetName || undefined,
            }
            return updatedMachines.map((machine: any) => {
              if (!machine.sets) return machine
              const updatedSets = machine.sets.map((set: any) => {
                if (setId && Number(set.id) === Number(setId)) {
                  const otherDies = (set.dies || []).filter((d: any) => String(d.die_id) !== String(dieId))
                  return {
                    ...set,
                    dies: [...otherDies, updatedDie]
                  }
                }
                return set
              })
              return { ...machine, sets: updatedSets }
            })
          }
          return old
        })
      }

      // Update individual die detail queries as well (if any are cached)
      const p1 = queryClient.getQueryData(['die', dieId])
      const p2 = queryClient.getQueryData(['dieDetail', dieId])
      if (p1 !== undefined) {
        queryClient.setQueryData(['die', dieId], (old: any) => old ? {
          ...old,
          current_set: setId ? Number(setId) : null,
          current_set_name: newSetName || undefined,
          set_name: newSetName || undefined,
        } : old)
      }
      if (p2 !== undefined) {
        queryClient.setQueryData(['dieDetail', dieId], (old: any) => old ? {
          ...old,
          current_set: setId ? Number(setId) : null,
          current_set_name: newSetName || undefined,
          set_name: newSetName || undefined,
        } : old)
      }

      return { previousDiesQueries, previousSearchDiesQueries, previousMachines, previousSets, previousDie: p1, previousDieDetail: p2 }
    },
    onError: (err: any, variables: any, context: any) => {
      if (context) {
        if (context.previousDiesQueries) {
          context.previousDiesQueries.forEach(([key, val]: any) => queryClient.setQueryData(key, val))
        }
        if (context.previousSearchDiesQueries) {
          context.previousSearchDiesQueries.forEach(([key, val]: any) => queryClient.setQueryData(key, val))
        }
        if (context.previousMachines !== undefined) {
          queryClient.setQueryData(['machinesList'], context.previousMachines)
        }
        if (context.previousSets !== undefined) {
          queryClient.setQueryData(['setsDropdownList'], context.previousSets)
        }
        if (context.previousDie !== undefined) {
          queryClient.setQueryData(['die', variables.dieId], context.previousDie)
        }
        if (context.previousDieDetail !== undefined) {
          queryClient.setQueryData(['dieDetail', variables.dieId], context.previousDieDetail)
        }
      }
      showToast(`Failed to allocate die: ${err.message}`, 'error')
    },
    onSettled: (data: any, err: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['searchDies'] })
      queryClient.invalidateQueries({ queryKey: ['machinesList'] })
      queryClient.invalidateQueries({ queryKey: ['setsDropdownList'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
      queryClient.invalidateQueries({ queryKey: ['die', variables.dieId] })
      queryClient.invalidateQueries({ queryKey: ['dieDetail', variables.dieId] })
    }
  })

  const reallocateSetMutation = useMutation({
    mutationFn: ({ setId, machineId }: { setId: any, machineId: any }) => request(`/api/sets/${setId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ machine: machineId })
    }),
    onMutate: async ({ setId, machineId }: { setId: any, machineId: any }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['dies'] })
      await queryClient.cancelQueries({ queryKey: ['searchDies'] })
      await queryClient.cancelQueries({ queryKey: ['machinesList'] })
      await queryClient.cancelQueries({ queryKey: ['setsDropdownList'] })

      // Snapshot
      const previousDiesQueries = queryClient.getQueriesData({ queryKey: ['dies'] })
      const previousSearchDiesQueries = queryClient.getQueriesData({ queryKey: ['searchDies'] })
      const previousMachines = queryClient.getQueryData(['machinesList'])
      const previousSets = queryClient.getQueryData(['setsDropdownList'])

      // Find machine name
      let newMachineName = ''
      if (machineId && previousMachines) {
        const foundMachine = (previousMachines as any[]).find((m: any) => Number(m.id) === Number(machineId))
        if (foundMachine) {
          newMachineName = foundMachine.name
        }
      }

      // Optimistically update sets dropdown query
      if (previousSets) {
        queryClient.setQueryData(['setsDropdownList'], (old: any) => {
          if (!Array.isArray(old)) return old
          return old.map((set: any) => {
            if (Number(set.id) === Number(setId)) {
              return {
                ...set,
                machine: machineId ? Number(machineId) : null,
                machine_name: newMachineName || undefined,
              }
            }
            return set
          })
        })
      }

      // Optimistically update machines list
      if (previousMachines) {
        queryClient.setQueryData(['machinesList'], (old: any) => {
          if (!Array.isArray(old)) return old
          let foundSet: any = null
          const updatedMachines = old.map((machine: any) => {
            const hasSet = machine.sets?.some((s: any) => Number(s.id) === Number(setId))
            if (hasSet) {
              foundSet = machine.sets.find((s: any) => Number(s.id) === Number(setId))
              return {
                ...machine,
                sets: machine.sets.filter((s: any) => Number(s.id) !== Number(setId))
              }
            }
            return machine
          })

          if (!foundSet && previousSets) {
            foundSet = (previousSets as any[]).find((s: any) => Number(s.id) === Number(setId))
          }

          if (foundSet) {
            const updatedSet = {
              ...foundSet,
              machine: machineId ? Number(machineId) : null,
              machine_name: newMachineName || undefined,
            }
            return updatedMachines.map((machine: any) => {
              if (machineId && Number(machine.id) === Number(machineId)) {
                const otherSets = (machine.sets || []).filter((s: any) => Number(s.id) !== Number(setId))
                return {
                  ...machine,
                  sets: [...otherSets, updatedSet]
                }
              }
              return machine
            })
          }
          return old
        })
      }

      // Optimistically update dies lists (dies in that set get machine_name updated)
      const updateSetMachine = (old: any) => {
        return mapQueryDataList(old, (die: any) => {
          if (Number(die.current_set) === Number(setId)) {
            return {
              ...die,
              machine_name: newMachineName || undefined,
            }
          }
          return die
        })
      }
      queryClient.setQueriesData({ queryKey: ['dies'] }, updateSetMachine)
      queryClient.setQueriesData({ queryKey: ['searchDies'] }, updateSetMachine)

      return { previousDiesQueries, previousSearchDiesQueries, previousMachines, previousSets }
    },
    onError: (err: any, variables: any, context: any) => {
      if (context) {
        if (context.previousDiesQueries) {
          context.previousDiesQueries.forEach(([key, val]: any) => queryClient.setQueryData(key, val))
        }
        if (context.previousSearchDiesQueries) {
          context.previousSearchDiesQueries.forEach(([key, val]: any) => queryClient.setQueryData(key, val))
        }
        if (context.previousMachines !== undefined) {
          queryClient.setQueryData(['machinesList'], context.previousMachines)
        }
        if (context.previousSets !== undefined) {
          queryClient.setQueryData(['setsDropdownList'], context.previousSets)
        }
      }
      showToast(`Failed to allocate set: ${err.message}`, 'error')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['searchDies'] })
      queryClient.invalidateQueries({ queryKey: ['machinesList'] })
      queryClient.invalidateQueries({ queryKey: ['setsDropdownList'] })
    }
  })

  const handleDropOnMachine = useCallback((e: React.DragEvent, machineId: any) => {
    e.preventDefault()
    setDragOverNode(null)
    setActiveDragType(null)
    if (role !== 'ROOT' && role !== 'ADMIN') return
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      if (data.type === 'set') {
        const { id: setId, currentMachineId } = data
        if (Number(currentMachineId) === Number(machineId)) return
        reallocateSetMutation.mutate({ setId, machineId })
      }
    } catch (err) {
      console.error(err)
    }
  }, [role, reallocateSetMutation])

  const handleDropOnSet = useCallback((e: React.DragEvent, setId: any) => {
    e.preventDefault()
    setDragOverNode(null)
    setActiveDragType(null)
    if (role !== 'ROOT' && role !== 'ADMIN') return
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      if (data.type === 'die') {
        const { id: dieId } = data
        reallocateDieMutation.mutate({ dieId, setId })
      }
    } catch (err) {
      console.error(err)
    }
  }, [role, reallocateDieMutation])

  const handleDropOnUnassigned = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOverNode(null)
    setActiveDragType(null)
    if (role !== 'ROOT' && role !== 'ADMIN') return
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      if (data.type === 'die') {
        const { id: dieId } = data
        reallocateDieMutation.mutate({ dieId, setId: null })
      }
    } catch (err) {
      console.error(err)
    }
  }, [role, reallocateDieMutation])

  const handleDragStartDie = useCallback((id: string) => {
    setActiveDragType('die')
  }, [])

  const handleDragEndDie = useCallback(() => {
    setActiveDragType(null)
    setDragOverNode(null)
  }, [])

  const handleCreateSubmit = (payload: any) => {
    setCreateError(null)
    createDieMutation.mutate(payload)
  }

  // Group dies into tree data structure (Memoized to prevent high-render CPU recalculations)
  const { diesBySet, unassignedDies, machinesWithData } = useMemo(() => {
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

    // Index sets by machine ID in O(S) time to avoid O(M * S) nested iterations
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
      }).filter((set: any) => showEmptyNodes || set.dies.length > 0)

      return {
        ...machine,
        sets: machineSets,
        totalDies: machineSets.reduce((sum: number, s: any) => sum + s.dies.length, 0)
      }
    }).filter((m: any) => showEmptyNodes || m.totalDies > 0)

    return { diesBySet, unassignedDies, machinesWithData }
  }, [dies, machinesList, setsList, showEmptyNodes])

  const handleExpandAll = () => {
    const nextMachs: Record<string | number, boolean> = {}
    const nextSets: Record<string | number, boolean> = {}
    machinesWithData.forEach((m: any) => {
      nextMachs[m.id] = true
      m.sets.forEach((s: any) => {
        nextSets[s.id] = true
      })
    })
    setExpandedMachines(nextMachs)
    setExpandedSets(nextSets)
    setExpandedUnassigned(true)
  }

  const handleCollapseAll = () => {
    setExpandedMachines({})
    setExpandedSets({})
    setExpandedUnassigned(false)
  }

  const [selectedNode, setSelectedNode] = useState<{ type: string; id?: any; machineId?: any } | null>(null)
  const [treeSearch, setTreeSearch] = useState('')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Filtered machines list for the tree navigation search
  const filteredMachines = useMemo(() => {
    if (!treeSearch) return machinesWithData
    const query = treeSearch.toLowerCase()
    return machinesWithData.map((m: any) => {
      const matchingSets = m.sets.filter((s: any) => s.name.toLowerCase().includes(query))
      const machineMatches = m.name.toLowerCase().includes(query)
      if (machineMatches || matchingSets.length > 0) {
        return {
          ...m,
          sets: machineMatches ? m.sets : matchingSets
        }
      }
      return null
    }).filter(Boolean) as any[]
  }, [machinesWithData, treeSearch])

  const isSearchActive = useMemo(() => {
    return !!(q || dieType || statusVal || casing || sizeMin || sizeMax || widthMin || widthMax || thickMin || thickMax)
  }, [q, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax])

  // Automatically select search node when search starts/ends
  useEffect(() => {
    if (isSearchActive) {
      setSelectedNode({ type: 'search' })
    } else {
      setSelectedNode(null)
    }
  }, [isSearchActive])

  // Set default selected node once data is loaded and no search is active
  useEffect(() => {
    if (!selectedNode && !isSearchActive) {
      if (machinesWithData && machinesWithData.length > 0) {
        setSelectedNode({ type: 'machine', id: machinesWithData[0].id })
      } else if (unassignedDies && unassignedDies.length > 0) {
        setSelectedNode({ type: 'unassigned' })
      }
    }
  }, [machinesWithData, unassignedDies, selectedNode, isSearchActive])

  // Compute active view based on selection and search status
  const activeView = useMemo(() => {
    if (isSearchActive && (!selectedNode || selectedNode.type === 'search')) {
      return 'search'
    }
    if (selectedNode) {
      return selectedNode.type
    }
    return 'placeholder'
  }, [selectedNode, isSearchActive])

  // Find currently selected machine details from active data
  const selectedMachine = useMemo(() => {
    if (selectedNode?.type === 'machine') {
      return machinesWithData.find((m: any) => m.id === selectedNode.id)
    }
    return null
  }, [selectedNode, machinesWithData])

  // Find currently selected set details from active data
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

  // Find raw machine and set to show empty fallback details if filtered out
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

  const sidebarTree = useMemo(() => (
    <div 
      className={`fixed inset-y-0 left-0 z-50 w-72 glass-panel border-r border-slate-800/40 flex flex-col transform transition-transform duration-300 ease-in-out shrink-0 md:sticky md:top-0 md:h-[calc(100vh-64px)] md:transform-none md:z-auto ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      } ${
        isSidebarCollapsed ? 'md:hidden' : 'md:flex'
      }`}
    >
      {/* Sidebar Header with Tree Search */}
      <div className="p-4 border-b border-slate-800/45 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-200 text-xs tracking-wider uppercase">Inventory Explorer</span>
          {/* Close button for mobile */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-1.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Tree Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input 
            type="text"
            placeholder="Search machines or sets..."
            value={treeSearch}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTreeSearch(e.target.value)}
            className="w-full glass-input rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none transition-all duration-200"
          />
        </div>

        {/* Toggle to show/hide empty nodes */}
        <div 
          className="flex items-center justify-between px-1 mt-1 text-slate-450 hover:text-slate-200 transition-colors select-none cursor-pointer" 
          onClick={() => setShowEmptyNodes(!showEmptyNodes)}
        >
          <span className="text-[10px] font-medium tracking-wider uppercase text-slate-400">Show empty machines & sets</span>
          <div className={`relative w-8 h-4 rounded-full transition-colors duration-200 shrink-0 ${showEmptyNodes ? 'bg-blue-600' : 'bg-slate-800'}`}>
            <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-200 ${showEmptyNodes ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          {/* Search Results Tree Node */}
          {isSearchActive && (
            <div className="mb-4">
              <div
                onClick={() => setSelectedNode({ type: 'search' })}
                className={`flex items-center w-full rounded-xl transition-all duration-200 select-none cursor-pointer py-2.5 pl-3 pr-3 border-l-4 ${
                  selectedNode?.type === 'search'
                    ? 'bg-blue-600/10 text-white border-blue-500 glow-blue'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-transparent'
                }`}
              >
                <Search className={`h-4 w-4 shrink-0 mr-2 ${selectedNode?.type === 'search' ? 'text-blue-400' : 'text-slate-500'}`} />
                <span className="text-xs font-bold truncate flex-1">Search Results</span>
                <span className="bg-slate-955 text-blue-400 text-xxs font-bold px-2 py-0.5 rounded-full border border-slate-800 shrink-0">
                  {dies?.length || 0}
                </span>
              </div>
            </div>
          )}

          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-blue-500" />
            <span>Machines / Production Sets</span>
          </div>
          
          <div className="space-y-1 mt-2">
            {filteredMachines.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-505 italic">No matches found</div>
            ) : (
              filteredMachines.map((machine: any) => {
                const isMachineExpanded = treeSearch ? true : !!expandedMachines[machine.id]
                const isMachineSelected = selectedNode?.type === 'machine' && selectedNode?.id === machine.id
                const isMachineDragOver = dragOverNode?.type === 'machine' && dragOverNode?.id === machine.id
                
                return (
                  <div key={machine.id} className="space-y-0.5">
                    {/* Machine Node */}
                    <div 
                      className={`group flex items-center w-full rounded-xl transition-all duration-200 select-none border-l-4 ${
                        isMachineDragOver
                          ? 'bg-blue-650 text-white border-blue-500 ring-2 ring-blue-500/20 pl-2 pr-3 py-2'
                          : isMachineSelected 
                            ? 'bg-blue-600/10 text-white border-blue-500 pl-2 pr-3 py-2 glow-blue' 
                            : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-transparent pl-2 pr-3 py-2 cursor-pointer'
                      }`}
                      onClick={() => setSelectedNode({ type: 'machine', id: machine.id })}
                      onDragOver={canCreate ? (e: React.DragEvent<HTMLDivElement>) => { if (activeDragType === 'set') e.preventDefault(); } : undefined}
                      onDragEnter={canCreate ? (e: React.DragEvent<HTMLDivElement>) => { if (activeDragType === 'set') setDragOverNode({ type: 'machine', id: machine.id }); } : undefined}
                      onDragLeave={canCreate ? (e: React.DragEvent<HTMLDivElement>) => setDragOverNode(null) : undefined}
                      onDrop={canCreate ? (e: React.DragEvent<HTMLDivElement>) => handleDropOnMachine(e, machine.id) : undefined}
                    >
                      <button
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation()
                          toggleMachine(machine.id)
                        }}
                        className="p-1 hover:bg-slate-850 rounded transition mr-1"
                      >
                        {isMachineExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                        )}
                      </button>
                      <Cpu className={`h-4 w-4 shrink-0 mr-2 ${isMachineSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                      <span className="text-xs font-semibold truncate flex-1">{machine.name}</span>
                      <span className="bg-slate-950 text-slate-500 text-xxs px-2 py-0.5 rounded-full border border-slate-800 shrink-0 font-medium">
                        {machine.totalDies}
                      </span>
                    </div>
                    
                    {/* Set Nodes (Children) */}
                    {isMachineExpanded && (
                      <div className="relative pl-4 space-y-0.5 ml-4 mt-0.5">
                        <div className="tree-branch-line" />
                        {machine.sets.map((set: any) => {
                          const isSetSelected = selectedNode?.type === 'set' && selectedNode?.id === set.id
                          const activeCount = set.dies.filter(isDieActive).length
                          const isSetDragOver = dragOverNode?.type === 'set' && dragOverNode?.id === set.id
                          return (
                            <div key={set.id} className="relative pl-6">
                              <div className="tree-leaf-line" />
                              <div
                                onClick={() => setSelectedNode({ type: 'set', id: set.id, machineId: machine.id })}
                                draggable={canCreate}
                                onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                                  if (canCreate) {
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'set', id: set.id, currentMachineId: machine.id }));
                                    setActiveDragType('set');
                                  }
                                }}
                                onDragEnd={() => {
                                  setActiveDragType(null);
                                  setDragOverNode(null);
                                }}
                                onDragOver={canCreate ? (e: React.DragEvent<HTMLDivElement>) => { if (activeDragType === 'die') e.preventDefault(); } : undefined}
                                onDragEnter={canCreate ? (e: React.DragEvent<HTMLDivElement>) => { if (activeDragType === 'die') setDragOverNode({ type: 'set', id: set.id }); } : undefined}
                                onDragLeave={canCreate ? () => setDragOverNode(null) : undefined}
                                onDrop={canCreate ? (e: React.DragEvent<HTMLDivElement>) => handleDropOnSet(e, set.id) : undefined}
                                className={`flex items-center w-full rounded-xl transition-all duration-200 select-none py-1.5 pl-3 pr-3 border-l-4 ${
                                  canCreate ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                                } ${
                                  isSetDragOver
                                    ? 'bg-indigo-600/30 text-white border-indigo-500 ring-2 ring-indigo-500/20'
                                    : isSetSelected
                                      ? 'bg-indigo-600/10 text-white border-indigo-500 glow-indigo'
                                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-transparent'
                                }`}
                              >
                                <Layers className={`h-3.5 w-3.5 shrink-0 mr-2 ${isSetSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                                <span className="text-xs font-medium truncate flex-1">{set.name}</span>
                                <span className="flex items-center gap-1.5 text-indigo-400 text-xxs font-bold px-1.5 py-0.5 rounded-full bg-slate-955 border border-slate-800 shrink-0">
                                  {activeCount > 0 && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dot-glow shrink-0 animate-pulse" />
                                  )}
                                  {set.dies.length}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

           {/* Unassigned / Standalone Dies Node */}
           {unassignedDies.length > 0 && (
             <div className="pt-4 border-t border-slate-800/60 mt-4">
               {(() => {
                 const isUnassignedDragOver = dragOverNode?.type === 'unassigned'
                 return (
                   <div
                     onClick={() => setSelectedNode({ type: 'unassigned' })}
                     onDragOver={canCreate ? (e: React.DragEvent<HTMLDivElement>) => { if (activeDragType === 'die') e.preventDefault(); } : undefined}
                     onDragEnter={canCreate ? (e: React.DragEvent<HTMLDivElement>) => { if (activeDragType === 'die') setDragOverNode({ type: 'unassigned' }); } : undefined}
                     onDragLeave={canCreate ? () => setDragOverNode(null) : undefined}
                     onDrop={canCreate ? (e: React.DragEvent<HTMLDivElement>) => handleDropOnUnassigned(e) : undefined}
                     className={`flex items-center w-full rounded-xl transition-all duration-200 select-none cursor-pointer py-2.5 pl-3 pr-3 border-l-4 ${
                       isUnassignedDragOver
                         ? 'bg-amber-655 text-white border-amber-500 ring-2 ring-amber-500/20'
                         : selectedNode?.type === 'unassigned'
                           ? 'bg-amber-600/10 text-white border-amber-500 glow-amber'
                           : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-transparent'
                     }`}
                   >
                     <Sliders className={`h-4 w-4 shrink-0 mr-2 ${selectedNode?.type === 'unassigned' ? 'text-amber-400' : 'text-slate-500'}`} />
                     <span className="text-xs font-bold truncate flex-1">Unassigned Dies</span>
                     <span className="bg-slate-950 text-amber-400 text-xxs font-bold px-2 py-0.5 rounded-full border border-slate-800 shrink-0">
                       {unassignedDies.length}
                     </span>
                   </div>
                 )
               })()}
             </div>
           )}
        </div>
      </div>
    </div>
  ), [
    isSidebarOpen,
    isSidebarCollapsed,
    treeSearch,
    isSearchActive,
    selectedNode,
    dies?.length,
    filteredMachines,
    expandedMachines,
    dragOverNode,
    activeDragType,
    canCreate,
    unassignedDies,
    expandedSets,
    toggleMachine,
    toggleSet,
    handleDropOnMachine,
    handleDropOnSet,
    handleDropOnUnassigned
  ])

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] relative bg-slate-950 text-white font-sans">
      
      {/* Sidebar Overlay (Mobile only) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* LEFT PANEL - Tree Navigation */}
      {sidebarTree}

      {/* RIGHT PANEL - Content Area */}
      <div className="flex-1 min-w-0 bg-slate-950 flex flex-col">
        
        {/* Top Header & Navbar-like control */}
        <div className="glass-panel border-b border-slate-800/40 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
          <div className="flex items-center">
            {/* Sidebar toggle button (Mobile: Drawer, Desktop/Tablet: Collapse) */}
            <button 
              onClick={() => {
                if (window.innerWidth < 768) {
                  setIsSidebarOpen(!isSidebarOpen)
                } else {
                  setIsSidebarCollapsed(!isSidebarCollapsed)
                }
              }}
              className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-850 rounded-xl text-slate-400 hover:text-white transition shadow-sm mr-4"
              title="Toggle Sidebar"
            >
              {/* Mobile View: Hamburger Menu */}
              <span className="md:hidden">
                <Menu className="h-5 w-5" />
              </span>
              {/* Desktop View: Dynamic Chevrons */}
              <span className="hidden md:inline">
                {isSidebarCollapsed ? (
                  <ChevronRight className="h-5 w-5 text-blue-400" />
                ) : (
                  <ChevronLeft className="h-5 w-5" />
                )}
              </span>
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Die Registry Inventory</h1>
              <p className="text-slate-400 text-xs mt-0.5 hidden sm:block">Professional enterprise-grade inventory registry dashboard.</p>
            </div>
          </div>
        </div>

        {/* Inner Content Area */}
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8 overflow-y-auto">
          
          {/* Action Bar (Search & Filter Section) */}
          <div className="glass-panel rounded-2xl p-6 shadow-xl border border-slate-800/40 blueprint-grid relative">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between relative z-10">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search Die ID, Size, Casing, Machine, Set, Location, Status..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full glass-input rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-550 focus:outline-none transition-all duration-350"
                />
                <p className="text-slate-400 text-xs mt-1.5 ml-1">Search examples: 12345, ceramic, toolroom, polishing, machine-1</p>
              </div>
              
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center space-x-2 px-5 py-3.5 rounded-xl border font-bold transition-all duration-350 w-full md:w-auto btn-glow glow-blue ${
                  showFilters 
                    ? 'bg-blue-600/15 text-blue-400 border-blue-500/30' 
                    : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <SlidersHorizontal className="h-5 w-5" />
                <span>Filters</span>
              </button>
            </div>

            {/* Secondary Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-800/40 relative z-10">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExpandAll}
                  className="bg-slate-955/45 hover:bg-slate-850 text-slate-305 hover:text-white border border-slate-800 px-4 py-2 rounded-xl text-xs font-semibold transition shadow-sm"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className="bg-slate-955/45 hover:bg-slate-850 text-slate-305 hover:text-white border border-slate-800 px-4 py-2 rounded-xl text-xs font-semibold transition shadow-sm"
                >
                  Collapse All
                </button>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 p-1 rounded-xl shadow-inner">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-300 ${
                    viewMode === 'list' 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-450 hover:text-white'
                  }`}
                >
                  List View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-300 ${
                    viewMode === 'grid' 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-450 hover:text-white'
                  }`}
                >
                  Rack Grid View
                </button>
              </div>

              {canCreate && (
                <button 
                  onClick={() => setIsCreateOpen(true)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300 text-xs md:text-sm btn-glow glow-blue"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New Die</span>
                </button>
              )}
            </div>

            {showFilters && (
              <FilterPanel
                dieType={dieType}
                statusVal={statusVal}
                casing={casing}
                sizeMin={sizeMin}
                sizeMax={sizeMax}
                widthMin={widthMin}
                widthMax={widthMax}
                thickMin={thickMin}
                thickMax={thickMax}
                onDieTypeChange={setDieType}
                onStatusChange={setStatusVal}
                onCasingChange={setCasing}
                onSizeMinChange={setSizeMin}
                onSizeMaxChange={setSizeMax}
                onWidthMinChange={setWidthMin}
                onWidthMaxChange={setWidthMax}
                onThickMinChange={setThickMin}
                onThickMaxChange={setThickMax}
              />
            )}
          </div>

          {/* Master Detail View Wrapper */}
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-10 w-1/4" />
              <div className="flex gap-6">
                <div className="flex-1">
                  <TableSkeleton rows={4} cols={5} />
                </div>
                <Skeleton className="w-80 h-[400px] hidden lg:block" />
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8">
              <p className="text-rose-400 font-bold">Error loading inventory: {error.message}</p>
            </div>
          ) : !selectedNode ? (
            <div className="text-center py-24 glass-panel rounded-2xl p-8 shadow-md border border-slate-800/40">
              <p className="text-slate-400 text-lg">No selection. Select a machine or set from the navigation tree.</p>
            </div>
          ) : (
            <div>
              
              {/* SEARCH RESULTS VIEW */}
              {activeView === 'search' && (
                <div className="space-y-8 animate-fadeIn">
                  {/* Header */}
                  <div className="border-b border-slate-800/40 pb-5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      <Search className="h-4 w-4 text-blue-500" />
                      <span>Search & Filter Results</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-white">Matching Dies</h2>
                    <p className="text-slate-400 text-xs mt-1">Showing all dies matching active registry filters.</p>
                  </div>

                  {dies && dies.length > 0 ? (
                    <>
                      {/* Stat Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
                        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-blue">
                          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-bold relative z-10">Total Matches</span>
                          <span className="text-2xl md:text-3xl font-black text-blue-400 mt-2 relative z-10 font-heading">{totalCount}</span>
                        </div>
                        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-emerald">
                          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-bold relative z-10">Active</span>
                          <span className="text-2xl md:text-3xl font-black text-emerald-400 mt-2 relative z-10 font-heading">
                            {dies.filter(isDieActive).length}
                          </span>
                        </div>
                        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-rose">
                          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-bold relative z-10">Inactive</span>
                          <span className="text-2xl md:text-3xl font-black text-rose-455 mt-2 relative z-10 font-heading">
                            {totalCount - dies.filter(isDieActive).length}
                          </span>
                        </div>
                      </div>

                      {/* Dies Table */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Database className="h-4 w-4 text-blue-500" />
                            <span>{viewMode === 'grid' ? 'Location Rack Grid' : 'Filtered Catalog'}</span>
                          </h3>
                          <span className="text-sm font-semibold text-slate-400">
                            Showing {dies.length} of {totalCount} {totalCount === 1 ? 'result' : 'results'}
                          </span>
                        </div>
                        {viewMode === 'grid' ? (
                          <RackLayoutGrid 
                            dies={activeDiesList} 
                            onMoveDie={(dieId, rackId, shelf, location) => moveDieLocationMutation.mutate({ dieId, rack: rackId, shelf, location })} 
                            canMove={canCreate} 
                            navigate={navigate}
                          />
                        ) : (
                          <div className="glass-panel rounded-2xl p-6 border border-slate-800/40">
                            <DiesTable 
                              diesList={dies} 
                              navigate={navigate} 
                              onDragStartDie={handleDragStartDie}
                              onDragEndDie={handleDragEndDie}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <EmptyState
                      title="No Matching Dies Found"
                      description="No dies in the facility match your active search terms or filters. Try clearing your filters or entering a different query."
                    />
                  )}
                </div>
              )}

              {/* MACHINE DETAILS VIEW */}
              {activeView === 'machine' && (
                <div className="space-y-8">
                  {selectedMachine ? (
                    <>
                      {/* Header */}
                      <div className="border-b border-slate-800/40 pb-5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-505 uppercase tracking-wider mb-1">
                          <Cpu className="h-4 w-4 text-blue-500" />
                          <span>Machine Explorer</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white">{selectedMachine.name}</h2>
                        <span className="inline-block px-2.5 py-1 text-xs font-semibold glass-card border border-blue-500/20 text-blue-400 rounded-lg mt-2">
                          {selectedMachine.category_name || 'Standard Category'}
                        </span>
                      </div>

                      {/* Stat Cards */}
                      <DieStats 
                        totalSets={selectedMachine.sets.length}
                        totalDies={selectedMachine.totalDies}
                        dies={selectedMachine.sets.reduce((acc: any[], s: any) => [...acc, ...s.dies], [])}
                      />

                      {/* Sets Cards Section */}
                      <div className="pt-4">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Layers className="h-4 w-4 text-indigo-400" />
                          <span>{viewMode === 'grid' ? 'Location Rack Grid' : 'Assigned Sets'}</span>
                        </h3>
                        {viewMode === 'grid' ? (
                          <RackLayoutGrid 
                            dies={activeDiesList} 
                            onMoveDie={(dieId, rackId, shelf, location) => moveDieLocationMutation.mutate({ dieId, rack: rackId, shelf, location })} 
                            canMove={canCreate} 
                            navigate={navigate}
                          />
                        ) : selectedMachine.sets.length === 0 ? (
                          <div className="glass-panel rounded-2xl p-8 text-center text-slate-400 italic border border-slate-800/40">
                            No sets found for this machine matching filters.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {selectedMachine.sets.map((set: any) => {
                              const sTotal = set.dies.length
                              const sActive = set.dies.filter(isDieActive).length
                              const sInactive = sTotal - sActive
                              return (
                                <div
                                  key={set.id}
                                  onClick={() => setSelectedNode({ type: 'set', id: set.id, machineId: selectedMachine.id })}
                                  className="glass-panel hover:bg-slate-900/40 border border-slate-800/40 hover:border-indigo-500/40 rounded-2xl p-5 cursor-pointer hover:-translate-y-0.5 transition-all duration-300 shadow-md group relative overflow-hidden"
                                >
                                  {/* Hover Glow */}
                                  <div className="absolute inset-x-0 bottom-0 h-1 bg-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                                  
                                  <div className="flex items-center justify-between mb-4">
                                    <span className="font-extrabold text-white text-base group-hover:text-indigo-400 transition-colors">
                                      {set.name}
                                    </span>
                                    <span className="text-xs bg-slate-950 text-indigo-400 font-bold px-2.5 py-0.5 rounded-full border border-slate-800">
                                      {sTotal} {sTotal === 1 ? 'Die' : 'Dies'}
                                    </span>
                                  </div>
                                  <div className="flex gap-4 text-xs text-slate-400 border-t border-slate-800/40 pt-3">
                                    <div>
                                      <span className="text-emerald-400 font-bold">{sActive}</span> Active
                                    </div>
                                    <div>
                                      <span className="text-rose-400 font-bold">{sInactive}</span> Inactive
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    /* Fallback when selected machine is filtered out */
                    <div className="space-y-6">
                      <div className="border-b border-slate-800/40 pb-5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-505 uppercase tracking-wider mb-1">
                          <Cpu className="h-4 w-4 text-blue-500" />
                          <span>Machine Explorer</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white">{rawMachine?.name || 'Machine'}</h2>
                      </div>
                      <div className="glass-panel rounded-2xl p-12 text-center shadow-lg border border-slate-800/40 blueprint-grid relative">
                        <Cpu className="h-12 w-12 text-slate-600 mx-auto mb-4 animate-pulse" />
                        <p className="text-slate-400 font-medium">No dies assigned to this machine match the current filters.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SET DETAILS VIEW */}
              {activeView === 'set' && (
                <div className="space-y-8">
                  {selectedSetData ? (
                    <>
                      {/* Header */}
                      <div className="border-b border-slate-800/40 pb-5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          <span>{selectedSetData.machine?.name}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                          <span className="text-indigo-400">{selectedSetData.set.name}</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white">{selectedSetData.set.name}</h2>
                        <p className="text-slate-400 text-xs mt-1">Assigned to machine: {selectedSetData.machine?.name}</p>
                      </div>

                      {/* Stat Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid hover:border-indigo-500/20 transition-all duration-300">
                          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Dies</span>
                          <span className="text-2xl md:text-3xl font-black text-white mt-2 font-heading">{selectedSetData.set.dies.length}</span>
                        </div>
                        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-emerald hover:border-emerald-500/20 transition-all duration-300">
                          <span className="text-slate-450 text-xs font-semibold uppercase tracking-wider font-bold">Active Dies</span>
                          <span className="text-2xl md:text-3xl font-black text-emerald-400 mt-2 font-heading">
                            {selectedSetData.set.dies.filter(isDieActive).length}
                          </span>
                        </div>
                        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-rose hover:border-rose-500/20 transition-all duration-300">
                          <span className="text-slate-450 text-xs font-semibold uppercase tracking-wider font-bold">Inactive Dies</span>
                          <span className="text-2xl md:text-3xl font-black text-rose-455 mt-2 font-heading">
                            {selectedSetData.set.dies.length - selectedSetData.set.dies.filter(isDieActive).length}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      {(() => {
                        const total = selectedSetData.set.dies.length
                        const active = selectedSetData.set.dies.filter(isDieActive).length
                        const inactive = total - active
                        const activePct = total > 0 ? ((active / total) * 100).toFixed(1) : '0.0'
                        const inactivePct = total > 0 ? ((inactive / total) * 100).toFixed(1) : '0.0'
                        return (
                          <div className="glass-panel rounded-2xl p-6 shadow-xl border border-slate-800/40 relative overflow-hidden blueprint-grid">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                              <Activity className="h-4 w-4 text-emerald-400" />
                              <span>Operational Ratio</span>
                            </h3>
                            <div className="flex justify-between text-xs font-bold mb-2">
                              <span className="text-emerald-400">Active: {active} ({activePct}%)</span>
                              <span className="text-rose-400">Inactive: {inactive} ({inactivePct}%)</span>
                            </div>
                            <div className="w-full bg-slate-950/80 h-3.5 rounded-full overflow-hidden flex border border-slate-850 p-0.5">
                              <div className="bg-gradient-to-r from-emerald-600 to-emerald-450 h-full rounded-full transition-all duration-550 shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ width: `${activePct}%` }} />
                              <div className="bg-gradient-to-r from-rose-600 to-rose-450 h-full rounded-full transition-all duration-550 shadow-[0_0_10px_rgba(239,68,68,0.3)]" style={{ width: `${inactivePct}%` }} />
                            </div>
                          </div>
                        )
                      })()}

                      {/* Dies Table */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-semibold text-slate-505 uppercase tracking-wider flex items-center gap-2">
                          <Layers className="h-4 w-4 text-indigo-400" />
                          <span>{viewMode === 'grid' ? 'Location Rack Grid' : 'Dies Inventory'}</span>
                        </h3>
                        {viewMode === 'grid' ? (
                          <RackLayoutGrid 
                            dies={activeDiesList} 
                            onMoveDie={(dieId, rackId, shelf, location) => moveDieLocationMutation.mutate({ dieId, rack: rackId, shelf, location })} 
                            canMove={canCreate} 
                            navigate={navigate}
                          />
                        ) : (
                          <div className="glass-panel rounded-2xl p-6 border border-slate-800/40">
                            <DiesTable 
                              diesList={selectedSetData.set.dies} 
                              navigate={navigate} 
                              onDragStartDie={handleDragStartDie}
                              onDragEndDie={handleDragEndDie}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    /* Fallback when selected set is filtered out */
                    <div className="space-y-6">
                      <div className="border-b border-slate-800/40 pb-5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          <span>{rawSetData?.machine?.name || 'Machine'}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                          <span className="text-indigo-400">{rawSetData?.set?.name || 'Set'}</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white">{rawSetData?.set?.name || 'Set'}</h2>
                      </div>
                      <div className="glass-panel rounded-2xl p-12 text-center shadow-lg border border-slate-800/40 blueprint-grid relative">
                        <Layers className="h-12 w-12 text-slate-600 mx-auto mb-4 animate-pulse" />
                        <p className="text-slate-400 font-medium">No dies assigned to this set match the current filters.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* UNASSIGNED STANDALONE DIES VIEW */}
              {activeView === 'unassigned' && (
                <div className="space-y-8">
                  {/* Header */}
                  <div className="border-b border-slate-800/40 pb-5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-550 uppercase tracking-wider mb-1">
                      <Sliders className="h-4 w-4 text-amber-500" />
                      <span>Standalone Inventory</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-white">Unassigned / Standalone Dies</h2>
                    <p className="text-slate-400 text-xs mt-1">Production dies that are currently unassigned to any machine set.</p>
                  </div>

                  {unassignedDies.length > 0 ? (
                    <>
                      {/* Stat Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
                        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-amber hover:border-amber-500/20 transition-all duration-300">
                          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-bold relative z-10">Total Standalone</span>
                          <span className="text-2xl md:text-3xl font-black text-amber-400 mt-2 relative z-10 font-heading">{unassignedDies.length}</span>
                        </div>
                        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-emerald hover:border-emerald-500/20 transition-all duration-300">
                          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-bold relative z-10">Active</span>
                          <span className="text-2xl md:text-3xl font-black text-emerald-400 mt-2 relative z-10 font-heading">
                            {unassignedDies.filter(isDieActive).length}
                          </span>
                        </div>
                        <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col justify-between border border-slate-800/40 relative overflow-hidden blueprint-grid glow-rose hover:border-rose-500/20 transition-all duration-300">
                          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-bold relative z-10">Inactive</span>
                          <span className="text-2xl md:text-3xl font-black text-rose-455 mt-2 relative z-10 font-heading">
                            {unassignedDies.length - unassignedDies.filter(isDieActive).length}
                          </span>
                        </div>
                      </div>

                      {/* Dies Table */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-semibold text-slate-505 uppercase tracking-wider flex items-center gap-2">
                          <Sliders className="h-4 w-4 text-amber-450" />
                          <span>{viewMode === 'grid' ? 'Location Rack Grid' : 'Dies Inventory'}</span>
                        </h3>
                        {viewMode === 'grid' ? (
                          <RackLayoutGrid 
                            dies={activeDiesList} 
                            onMoveDie={(dieId, rackId, shelf, location) => moveDieLocationMutation.mutate({ dieId, rack: rackId, shelf, location })} 
                            canMove={canCreate} 
                            navigate={navigate}
                          />
                        ) : (
                          <div className="glass-panel rounded-2xl p-6 border border-slate-800/40">
                            <DiesTable 
                              diesList={unassignedDies} 
                              navigate={navigate} 
                              onDragStartDie={handleDragStartDie}
                              onDragEndDie={handleDragEndDie}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="glass-panel rounded-2xl p-12 text-center shadow-lg border border-slate-800/40 blueprint-grid relative">
                      <Sliders className="h-12 w-12 text-slate-600 mx-auto mb-4 animate-pulse" />
                      <p className="text-slate-400 font-medium">No unassigned dies match the current filters.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Die Modal */}
      <CreateDieModal 
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        isSubmitting={createDieMutation.isPending}
        error={createError}
        setsList={setsList || []}
      />
    </div>
  )
}


