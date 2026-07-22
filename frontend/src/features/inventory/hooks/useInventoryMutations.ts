import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../../../hooks/useApi'
import { useToast } from '../../../contexts/ToastContext'

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

export function useInventoryMutations(setIsCreateOpen?: (open: boolean) => void, setCreateError?: (err: string | null) => void) {
  const { request } = useApi()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  // Create die mutation
  const createDieMutation = useMutation({
    mutationFn: (payload: any) => request('/api/dies/', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
      if (setIsCreateOpen) setIsCreateOpen(false)
    },
    onError: (err: any) => {
      if (setCreateError) setCreateError(err.message)
    }
  })

  // Mutation for updating die location (visual grid)
  const moveDieLocationMutation = useMutation({
    mutationFn: ({ dieId, rack, shelf }: { dieId: string, rack?: number | null, shelf?: number | null }) => request(`/api/dies/${dieId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ rack, shelf })
    }),
    onMutate: async ({ dieId, rack, shelf }: { dieId: string, rack?: number | null, shelf?: number | null }) => {
      await queryClient.cancelQueries({ queryKey: ['dies'] })
      await queryClient.cancelQueries({ queryKey: ['searchDies'] })
      const previousDies = queryClient.getQueriesData({ queryKey: ['dies'] })
      const previousSearch = queryClient.getQueriesData({ queryKey: ['searchDies'] })

      const updateLoc = (old: any) => {
        return mapQueryDataList(old, (d: any) => String(d.die_id) === String(dieId) ? { ...d, rack_id: rack !== undefined ? rack : d.rack_id, shelf: shelf !== undefined ? shelf : d.shelf } : d)
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
      showToast(`Successfully moved die ${variables.dieId}.`, 'success')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['searchDies'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
    }
  })

  // Mutation for reallocating a die to a set
  const reallocateDieMutation = useMutation({
    mutationFn: ({ dieId, setId }: { dieId: any, setId: any }) => request(`/api/dies/${dieId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ current_set: setId })
    }),
    onMutate: async ({ dieId, setId }: { dieId: any, setId: any }) => {
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

  // Mutation for reallocating a set to a machine
  const reallocateSetMutation = useMutation({
    mutationFn: ({ setId, machineId }: { setId: any, machineId: any }) => request(`/api/sets/${setId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ machine: machineId })
    }),
    onMutate: async ({ setId, machineId }: { setId: any, machineId: any }) => {
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
        const foundMachine = (previousMachines as any[]).find((m: any) => Number(m.id) === Number(machineId))
        if (foundMachine) {
          newMachineName = foundMachine.name
        }
      }

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

  // Mutation for reordering sets in a machine
  const reorderSetsMutation = useMutation({
    mutationFn: ({ machineId, orderedSetIds }: { machineId: any, orderedSetIds: any[] }) => request('/api/sets/reorder/', {
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
        queryClient.setQueryData(['machinesList'], (old: any) => {
          if (!Array.isArray(old)) return old
          return old.map((machine: any) => {
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
    onError: (err: any, variables: any, context: any) => {
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
