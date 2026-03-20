import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCommoditySpreads() {
  return useQuery({
    queryKey: ['commodity-spreads'],
    queryFn: () => api.get<any>('/commodity-spreads'),
    staleTime: 60 * 60 * 1000,
  });
}
