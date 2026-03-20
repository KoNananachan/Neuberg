import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useVarianceSwaps() {
  return useQuery({
    queryKey: ['variance-swaps'],
    queryFn: () => api.get<any>('/variance-swaps'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
