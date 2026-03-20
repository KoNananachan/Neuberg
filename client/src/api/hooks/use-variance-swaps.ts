import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useVarianceSwaps() {
  return useQuery({
    queryKey: ['variance-swaps'],
    queryFn: () => api.get<any>('/variance-swaps'),
    staleTime: 60 * 60 * 1000,
  });
}
