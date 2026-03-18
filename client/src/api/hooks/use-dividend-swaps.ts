import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDividendSwaps() {
  return useQuery({
    queryKey: ['dividend-swaps'],
    queryFn: () => api.get<any>('/dividend-swaps'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
