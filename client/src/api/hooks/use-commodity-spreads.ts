import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCommoditySpreads() {
  return useQuery({
    queryKey: ['commodity-spreads'],
    queryFn: () => api.get<any>('/commodity-spreads'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
