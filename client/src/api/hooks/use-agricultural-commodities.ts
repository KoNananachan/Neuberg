import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useAgriculturalCommodities() {
  return useQuery({
    queryKey: ['agricultural-commodities'],
    queryFn: () => api.get<any>('/agricultural-commodities'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
