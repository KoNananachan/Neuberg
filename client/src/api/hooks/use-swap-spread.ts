import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSwapSpread() {
  return useQuery({
    queryKey: ['swap-spread'],
    queryFn: () => api.get<any>('/swap-spread'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
