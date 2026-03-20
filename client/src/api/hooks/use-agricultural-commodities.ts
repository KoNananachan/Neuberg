import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useAgriculturalCommodities() {
  return useQuery({
    queryKey: ['agricultural-commodities'],
    queryFn: () => api.get<any>('/agricultural-commodities'),
    staleTime: 60 * 60 * 1000,
  });
}
