import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDividendSwaps() {
  return useQuery({
    queryKey: ['dividend-swaps'],
    queryFn: () => api.get<any>('/dividend-swaps'),
    staleTime: 60 * 60 * 1000,
  });
}
