import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../../../hooks/useApi'
import type { MachineDieStock, DieInventoryRecount } from '../types'

export function useMachineDieStocks(machineId: number | undefined) {
  const { request } = useApi()
  return useQuery<MachineDieStock[]>({
    queryKey: ['machineDieStocks', machineId],
    queryFn: () => request(`/api/machine-die-stock/?machine=${machineId}`),
    enabled: !!machineId,
  })
}

export function useDieInventoryRecounts() {
  const { request } = useApi()
  return useQuery<DieInventoryRecount[]>({
    queryKey: ['dieInventoryRecounts'],
    queryFn: () => request('/api/inventory-recounts/'),
  })
}

export function useDieInventoryRecount(recountId: number | undefined) {
  const { request } = useApi()
  return useQuery<DieInventoryRecount>({
    queryKey: ['dieInventoryRecount', recountId],
    queryFn: () => request(`/api/inventory-recounts/${recountId}/`),
    enabled: !!recountId,
  })
}

export function useCreateRecount() {
  const { request } = useApi()
  const queryClient = useQueryClient()
  return useMutation<DieInventoryRecount, Error, Partial<DieInventoryRecount>>({
    mutationFn: (payload) =>
      request('/api/inventory-recounts/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dieInventoryRecounts'] })
    },
  })
}

export function useUpdateRecount() {
  const { request } = useApi()
  const queryClient = useQueryClient()
  return useMutation<DieInventoryRecount, Error, { id: number; data: Partial<DieInventoryRecount> }>({
    mutationFn: ({ id, data }) =>
      request(`/api/inventory-recounts/${id}/`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dieInventoryRecounts'] })
      queryClient.invalidateQueries({ queryKey: ['dieInventoryRecount', variables.id] })
    },
  })
}

export function useSubmitRecount() {
  const { request } = useApi()
  const queryClient = useQueryClient()
  return useMutation<{ detail: string }, Error, number>({
    mutationFn: (id) =>
      request(`/api/inventory-recounts/${id}/submit/`, {
        method: 'POST',
      }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['dieInventoryRecounts'] })
      queryClient.invalidateQueries({ queryKey: ['dieInventoryRecount', id] })
      queryClient.invalidateQueries({ queryKey: ['machineDieStocks'] })
    },
  })
}

export function useMachinesQuery() {
  const { request } = useApi()
  return useQuery<{ id: number; name: string }[]>({
    queryKey: ['machinesList'],
    queryFn: () => request('/api/machines/'),
  })
}
