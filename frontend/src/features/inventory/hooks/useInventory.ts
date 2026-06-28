import { useQuery } from '@tanstack/react-query'
import { useApi } from '../../../hooks/useApi'
import { Die } from '../../../types'

export function useDieQuery(dieId: string | undefined) {
  const { request } = useApi()
  return useQuery<Die>({
    queryKey: ['dieDetail', dieId],
    queryFn: () => request(`/api/dies/${dieId}/`),
    enabled: !!dieId
  })
}

export function useSetsQuery() {
  const { request } = useApi()
  return useQuery({
    queryKey: ['setsList'],
    queryFn: () => request('/api/sets/'),
  })
}

export function useMachinesQuery() {
  const { request } = useApi()
  return useQuery({
    queryKey: ['machinesList'],
    queryFn: () => request('/api/machines/'),
  })
}
