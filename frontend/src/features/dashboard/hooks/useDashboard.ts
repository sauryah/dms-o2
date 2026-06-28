import { useQuery } from '@tanstack/react-query'
import { useApi } from '../../../hooks/useApi'
import { Die } from '../../../types'

export interface SearchQueryParams {
  q?: string;
  die_type?: string;
  status?: string;
  casing?: string;
  size_min?: string;
  size_max?: string;
  width_min?: string;
  width_max?: string;
  thick_min?: string;
  thick_max?: string;
  limit?: string;
}

export function useStatsQuery() {
  const { request } = useApi()
  return useQuery({
    queryKey: ['allDiesStats'],
    queryFn: () => request('/api/go/stats')
  })
}

export function useSearchQuery(params: SearchQueryParams, enabled = true) {
  const { request } = useApi()
  return useQuery<Die[]>({
    queryKey: ['searchDies', params],
    queryFn: async ({ signal }) => {
      let url = '/api/go/search'
      const searchParams = new URLSearchParams()
      if (params.q) searchParams.append('q', params.q)
      if (params.die_type) searchParams.append('die_type', params.die_type)
      if (params.status) searchParams.append('status', params.status)
      if (params.casing) searchParams.append('casing', params.casing)
      
      if (params.size_min) searchParams.append('size_min', params.size_min)
      if (params.size_max) searchParams.append('size_max', params.size_max)
      if (params.width_min) searchParams.append('width_min', params.width_min)
      if (params.width_max) searchParams.append('width_max', params.width_max)
      if (params.thick_min) searchParams.append('thick_min', params.thick_min)
      if (params.thick_max) searchParams.append('thick_max', params.thick_max)
      if (params.limit) searchParams.append('limit', params.limit)
      
      const queryString = searchParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
      
      return request(url, { signal })
    },
    enabled: enabled
  })
}
