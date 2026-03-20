import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCommodityFundamentals() {
  return useQuery({
    queryKey: ['commodity-fundamentals'],
    queryFn: () => api.get<any>('/commodity-fundamentals'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
