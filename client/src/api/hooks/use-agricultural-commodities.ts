import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useAgriculturalCommodities() {
  return useQuery({
    queryKey: ['agricultural-commodities'],
    queryFn: () => api.get<any>('/agricultural-commodities'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
