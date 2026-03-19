import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useDividendSwap() {
  return useQuery({
    queryKey: ['dividend-swap'],
    queryFn: () => api.get<any>('/dividend-swap'),
    refetchInterval: 300000,
    staleTime: 180000,
  });
}
