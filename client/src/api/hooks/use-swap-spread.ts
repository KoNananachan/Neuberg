import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSwapSpread() {
  return useQuery({
    queryKey: ['swap-spread'],
    queryFn: () => api.get<any>('/swap-spread'),
    staleTime: 60 * 60 * 1000,
  });
}
