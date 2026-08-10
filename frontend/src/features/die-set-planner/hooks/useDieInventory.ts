import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../../../hooks/useApi'
import type { MachineDieStock, DieInventoryRecount, EnamelMachine } from '../types'

export function useMachineDieStocks(enamelMachineId: number | undefined) {
  const { request } = useApi()
  return useQuery<MachineDieStock[]>({
    queryKey: ['machineDieStocks', enamelMachineId],
    queryFn: () => request(`/api/machine-die-stock/?enamel_machine=${enamelMachineId}`),
    enabled: !!enamelMachineId,
  })
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export function useDieInventoryRecounts(page: number = 1) {
  const { request } = useApi()
  return useQuery<PaginatedResponse<DieInventoryRecount>>({
    queryKey: ['dieInventoryRecounts', page],
    queryFn: () => request(`/api/inventory-recounts/?page=${page}`),
  })
}

export function useAllSubmittedRecounts() {
  const { request } = useApi()
  return useQuery<DieInventoryRecount[]>({
    queryKey: ['dieInventoryRecounts', 'all-submitted'],
    queryFn: () => request('/api/inventory-recounts/?all=true&status=SUBMITTED'),
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

// Enamel Machine CRUD hooks
export function useEnamelMachines() {
  const { request } = useApi()
  return useQuery<EnamelMachine[]>({
    queryKey: ['enamelMachinesList'],
    queryFn: () => request('/api/enamel-machines/'),
  })
}

export function useCreateEnamelMachine() {
  const { request } = useApi()
  const queryClient = useQueryClient()
  return useMutation<EnamelMachine, Error, Partial<EnamelMachine>>({
    mutationFn: (payload) =>
      request('/api/enamel-machines/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enamelMachinesList'] })
    },
  })
}

export function useUpdateEnamelMachine() {
  const { request } = useApi()
  const queryClient = useQueryClient()
  return useMutation<EnamelMachine, Error, { id: number; data: Partial<EnamelMachine> }>({
    mutationFn: ({ id, data }) =>
      request(`/api/enamel-machines/${id}/`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enamelMachinesList'] })
    },
  })
}

export function useDeleteEnamelMachine() {
  const { request } = useApi()
  const queryClient = useQueryClient()
  return useMutation<void, Error, number>({
    mutationFn: (id) =>
      request(`/api/enamel-machines/${id}/`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enamelMachinesList'] })
    },
  })
}
