import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSwapSpread() {
  return useQuery({
    queryKey: ['swap-spread'],
    queryFn: () => api.get<any>('/swap-spread'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
