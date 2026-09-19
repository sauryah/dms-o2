import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../../../hooks/useApi'
import { useToast } from '../../../contexts/ToastContext'
import { Die, Set as DieSet, Machine } from '../../../types'

interface PaginatedResults<T> {
  results: T[]
  count?: number
  next?: string | null
  previous?: string | null
  [key: string]: unknown
}

const mapQueryDataList = <T extends { die_id?: string | number }>(
  old: unknown,
  mapFn: (d: T) => T
): unknown => {
  if (!old) return old
  if (Array.isArray(old)) {
    return old.map(mapFn as (item: unknown) => unknown)
  }
  if (old && typeof old === 'object' && Array.isArray((old as PaginatedResults<T>).results)) {
    return {
      ...(old as Record<string, unknown>),
      results: (old as PaginatedResults<T>).results.map(mapFn)
    }
  }
  return old
}

interface MoveDieContext {
  previousDies: [readonly unknown[], unknown][]
  previousSearch: [readonly unknown[], unknown][]
}

interface ReallocateDieContext {
  previousDiesQueries: [readonly unknown[], unknown][]
  previousSearchDiesQueries: [readonly unknown[], unknown][]
  previousMachines: unknown
  previousSets: unknown
  previousDie: unknown
  previousDieDetail: unknown
}

interface ReallocateSetContext {
  previousDiesQueries: [readonly unknown[], unknown][]
  previousSearchDiesQueries: [readonly unknown[], unknown][]
  previousMachines: unknown
  previousSets: unknown
}

interface ReorderSetsContext {
  previousMachines: unknown
  previousSets: unknown
}

export function useInventoryMutations(setIsCreateOpen?: (open: boolean) => void, setCreateError?: (err: string | null) => void) {
  const { request } = useApi()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  // Create die mutation
  const createDieMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => request('/api/dies/', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
      if (setIsCreateOpen) setIsCreateOpen(false)
    },
    onError: (err: Error) => {
      if (setCreateError) setCreateError(err.message)
    }
  })

  // Mutation for updating die location (visual grid)
  const moveDieLocationMutation = useMutation<unknown, Error, { dieId: string; rack?: number | null; shelf?: number | null }, MoveDieContext>({
    mutationFn: ({ dieId, rack, shelf }) => request(`/api/dies/${dieId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ rack, shelf })
    }),
    onMutate: async ({ dieId, rack, shelf }) => {
      await queryClient.cancelQueries({ queryKey: ['dies'] })
      await queryClient.cancelQueries({ queryKey: ['searchDies'] })
      const previousDies = queryClient.getQueriesData({ queryKey: ['dies'] })
      const previousSearch = queryClient.getQueriesData({ queryKey: ['searchDies'] })

      const updateLoc = (old: unknown) => {
        return mapQueryDataList<Die>(old, (d) => String(d.die_id) === String(dieId) ? { ...d, rack_id: rack !== undefined ? rack : d.rack_id, shelf: shelf !== undefined ? shelf : d.shelf } : d)
      }
      queryClient.setQueriesData({ queryKey: ['dies'] }, updateLoc)
      queryClient.setQueriesData({ queryKey: ['searchDies'] }, updateLoc)

      return { previousDies, previousSearch }
    },
    onError: (err, _variables, context) => {
      if (context) {
        if (context.previousDies) {
          context.previousDies.forEach(([key, val]) => queryClient.setQueryData(key, val))
        }
        if (context.previousSearch) {
          context.previousSearch.forEach(([key, val]) => queryClient.setQueryData(key, val))
        }
      }
      showToast(`Failed to move die: ${err.message}`, 'error')
    },
    onSuccess: (_data, variables) => {
      showToast(`Successfully moved die ${variables.dieId}.`, 'success')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['searchDies'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
    }
  })

  // Mutation for reallocating a die to a set
  const reallocateDieMutation = useMutation<unknown, Error, { dieId: string | number; setId: number | null }, ReallocateDieContext>({
    mutationFn: ({ dieId, setId }) => request(`/api/dies/${dieId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ current_set: setId })
    }),
    onMutate: async ({ dieId, setId }) => {
      await queryClient.cancelQueries({ queryKey: ['dies'] })
      await queryClient.cancelQueries({ queryKey: ['searchDies'] })
      await queryClient.cancelQueries({ queryKey: ['machinesList'] })
      await queryClient.cancelQueries({ queryKey: ['setsDropdownList'] })

      const previousDiesQueries = queryClient.getQueriesData({ queryKey: ['dies'] })
      const previousSearchDiesQueries = queryClient.getQueriesData({ queryKey: ['searchDies'] })
      const previousMachines = queryClient.getQueryData(['machinesList'])
      const previousSets = queryClient.getQueryData(['setsDropdownList'])

      let newSetName = ''
      if (setId) {
        const sets: DieSet[] = (previousSets as DieSet[]) || []
        const foundSet = sets.find((s) => Number(s.id) === Number(setId))
        if (foundSet) {
          newSetName = foundSet.name
        } else if (previousMachines) {
          for (const machine of (previousMachines as Machine[])) {
            const foundSetInMachine = machine.sets?.find((s) => Number(s.id) === Number(setId))
            if (foundSetInMachine) {
              newSetName = foundSetInMachine.name
              break
            }
          }
        }
      }

      const updateCurrentSet = (old: unknown) => {
        return mapQueryDataList<Die>(old, (die) => {
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

      if (previousSets) {
        queryClient.setQueryData(['setsDropdownList'], (old: unknown) => {
          if (!Array.isArray(old)) return old
          let foundDie: Die | null = null
          const setsList = old as DieSet[]
          const updatedSets = setsList.map((set) => {
            const hasDie = set.dies?.some((d) => String(d.die_id) === String(dieId))
            if (hasDie) {
              foundDie = set.dies.find((d) => String(d.die_id) === String(dieId)) || null
              return {
                ...set,
                dies: set.dies.filter((d) => String(d.die_id) !== String(dieId))
              }
            }
            return set
          })

          if (!foundDie) {
            for (const [, diesData] of previousDiesQueries) {
              if (Array.isArray(diesData)) {
                foundDie = (diesData as Die[]).find((d) => String(d.die_id) === String(dieId)) || null
                if (foundDie) break
              }
            }
          }

          if (foundDie) {
            const updatedDie: Die = {
              ...foundDie,
              current_set: setId ? Number(setId) : null,
              current_set_name: newSetName || undefined,
              set_name: newSetName || undefined,
            }
            return updatedSets.map((set) => {
              if (setId && Number(set.id) === Number(setId)) {
                const otherDies = (set.dies || []).filter((d) => String(d.die_id) !== String(dieId))
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

      if (previousMachines) {
        queryClient.setQueryData(['machinesList'], (old: unknown) => {
          if (!Array.isArray(old)) return old
          let foundDie: Die | null = null
          const machinesList = old as Machine[]
          const updatedMachines = machinesList.map((machine) => {
            if (!machine.sets) return machine
            const updatedSets = machine.sets.map((set) => {
              const hasDie = set.dies?.some((d) => String(d.die_id) === String(dieId))
              if (hasDie) {
                foundDie = set.dies.find((d) => String(d.die_id) === String(dieId)) || null
                return {
                  ...set,
                  dies: set.dies.filter((d) => String(d.die_id) !== String(dieId))
                }
              }
              return set
            })
            return { ...machine, sets: updatedSets }
          })

          if (!foundDie) {
            for (const [, diesData] of previousDiesQueries) {
              if (Array.isArray(diesData)) {
                foundDie = (diesData as Die[]).find((d) => String(d.die_id) === String(dieId)) || null
                if (foundDie) break
              }
            }
          }

          if (foundDie) {
            const updatedDie: Die = {
              ...foundDie,
              current_set: setId ? Number(setId) : null,
              current_set_name: newSetName || undefined,
              set_name: newSetName || undefined,
            }
            return updatedMachines.map((machine) => {
              if (!machine.sets) return machine
              const updatedSets = machine.sets.map((set) => {
                if (setId && Number(set.id) === Number(setId)) {
                  const otherDies = (set.dies || []).filter((d) => String(d.die_id) !== String(dieId))
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

      const p1 = queryClient.getQueryData(['die', dieId])
      const p2 = queryClient.getQueryData(['dieDetail', dieId])
      if (p1 !== undefined) {
        queryClient.setQueryData(['die', dieId], (old: unknown) => old ? {
          ...(old as Record<string, unknown>),
          current_set: setId ? Number(setId) : null,
          current_set_name: newSetName || undefined,
          set_name: newSetName || undefined,
        } : old)
      }
      if (p2 !== undefined) {
        queryClient.setQueryData(['dieDetail', dieId], (old: unknown) => old ? {
          ...(old as Record<string, unknown>),
          current_set: setId ? Number(setId) : null,
          current_set_name: newSetName || undefined,
          set_name: newSetName || undefined,
        } : old)
      }

      return { previousDiesQueries, previousSearchDiesQueries, previousMachines, previousSets, previousDie: p1, previousDieDetail: p2 }
    },
    onError: (err, variables, context) => {
      if (context) {
        if (context.previousDiesQueries) {
          context.previousDiesQueries.forEach(([key, val]) => queryClient.setQueryData(key, val))
        }
        if (context.previousSearchDiesQueries) {
          context.previousSearchDiesQueries.forEach(([key, val]) => queryClient.setQueryData(key, val))
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
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['searchDies'] })
      queryClient.invalidateQueries({ queryKey: ['machinesList'] })
      queryClient.invalidateQueries({ queryKey: ['setsDropdownList'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
      queryClient.invalidateQueries({ queryKey: ['die', variables.dieId] })
      queryClient.invalidateQueries({ queryKey: ['dieDetail', variables.dieId] })
    }
  })

  // Mutation for reallocating a set to a machine
  const reallocateSetMutation = useMutation<unknown, Error, { setId: number | string; machineId: number | null }, ReallocateSetContext>({
    mutationFn: ({ setId, machineId }) => request(`/api/sets/${setId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ machine: machineId })
    }),
    onMutate: async ({ setId, machineId }) => {
      await queryClient.cancelQueries({ queryKey: ['dies'] })
      await queryClient.cancelQueries({ queryKey: ['searchDies'] })
      await queryClient.cancelQueries({ queryKey: ['machinesList'] })
      await queryClient.cancelQueries({ queryKey: ['setsDropdownList'] })

      const previousDiesQueries = queryClient.getQueriesData({ queryKey: ['dies'] })
      const previousSearchDiesQueries = queryClient.getQueriesData({ queryKey: ['searchDies'] })
      const previousMachines = queryClient.getQueryData(['machinesList'])
      const previousSets = queryClient.getQueryData(['setsDropdownList'])

      let newMachineName = ''
      if (machineId && previousMachines) {
        const foundMachine = (previousMachines as Machine[]).find((m) => Number(m.id) === Number(machineId))
        if (foundMachine) {
          newMachineName = foundMachine.name
        }
      }

      if (previousSets) {
        queryClient.setQueryData(['setsDropdownList'], (old: unknown) => {
          if (!Array.isArray(old)) return old
          return (old as DieSet[]).map((set) => {
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

      if (previousMachines) {
        queryClient.setQueryData(['machinesList'], (old: unknown) => {
          if (!Array.isArray(old)) return old
          let foundSet: DieSet | null = null
          const machinesList = old as Machine[]
          const updatedMachines = machinesList.map((machine) => {
            const hasSet = machine.sets?.some((s) => Number(s.id) === Number(setId))
            if (hasSet) {
              foundSet = machine.sets.find((s) => Number(s.id) === Number(setId)) || null
              return {
                ...machine,
                sets: machine.sets.filter((s) => Number(s.id) !== Number(setId))
              }
            }
            return machine
          })

          if (!foundSet && previousSets) {
            foundSet = (previousSets as DieSet[]).find((s) => Number(s.id) === Number(setId)) || null
          }

          if (foundSet) {
            const updatedSet: DieSet = {
              ...foundSet,
              machine: machineId ? Number(machineId) : null,
              machine_name: newMachineName || undefined,
            }
            return updatedMachines.map((machine) => {
              if (machineId && Number(machine.id) === Number(machineId)) {
                const otherSets = (machine.sets || []).filter((s) => Number(s.id) !== Number(setId))
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

      const updateSetMachine = (old: unknown) => {
        return mapQueryDataList<Die>(old, (die) => {
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
    onError: (err, _variables, context) => {
      if (context) {
        if (context.previousDiesQueries) {
          context.previousDiesQueries.forEach(([key, val]) => queryClient.setQueryData(key, val))
        }
        if (context.previousSearchDiesQueries) {
          context.previousSearchDiesQueries.forEach(([key, val]) => queryClient.setQueryData(key, val))
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

  // Mutation for reordering sets in a machine
  const reorderSetsMutation = useMutation<unknown, Error, { machineId: number | string; orderedSetIds: number[] }, ReorderSetsContext>({
    mutationFn: ({ machineId, orderedSetIds }) => request('/api/sets/reorder/', {
      method: 'POST',
      body: JSON.stringify({ machine_id: machineId, ordered_set_ids: orderedSetIds })
    }),
    onMutate: async ({ machineId, orderedSetIds }) => {
      await queryClient.cancelQueries({ queryKey: ['machinesList'] })
      await queryClient.cancelQueries({ queryKey: ['setsDropdownList'] })

      const previousMachines = queryClient.getQueryData(['machinesList'])
      const previousSets = queryClient.getQueryData(['setsDropdownList'])

      // Optimistically update the UI order
      if (previousMachines) {
        queryClient.setQueryData(['machinesList'], (old: unknown) => {
          if (!Array.isArray(old)) return old
          return (old as Machine[]).map((machine) => {
            if (Number(machine.id) === Number(machineId)) {
              const sets = machine.sets || []
              const sortedSets = [...sets].sort((a, b) => {
                const indexA = orderedSetIds.indexOf(a.id)
                const indexB = orderedSetIds.indexOf(b.id)
                if (indexA === -1) return 1
                if (indexB === -1) return -1
                return indexA - indexB
              })
              return {
                ...machine,
                sets: sortedSets
              }
            }
            return machine
          })
        })
      }

      return { previousMachines, previousSets }
    },
    onError: (err, _variables, context) => {
      if (context) {
        if (context.previousMachines !== undefined) {
          queryClient.setQueryData(['machinesList'], context.previousMachines)
        }
        if (context.previousSets !== undefined) {
          queryClient.setQueryData(['setsDropdownList'], context.previousSets)
        }
      }
      showToast(`Failed to reorder sets: ${err.message}`, 'error')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['machinesList'] })
      queryClient.invalidateQueries({ queryKey: ['setsDropdownList'] })
    }
  })

  return {
    createDieMutation,
    moveDieLocationMutation,
    reallocateDieMutation,
    reallocateSetMutation,
    reorderSetsMutation
  }
}
