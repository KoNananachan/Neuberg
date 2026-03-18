import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCommoditySpreads() {
  return useQuery({
    queryKey: ['commodity-spreads'],
    queryFn: () => api.get<any>('/commodity-spreads'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
