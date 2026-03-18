import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useInflationSwap() {
  return useQuery({
    queryKey: ['inflation-swap'],
    queryFn: () => api.get<any>('/inflation-swap'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
