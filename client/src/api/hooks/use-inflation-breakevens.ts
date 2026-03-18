import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useInflationBreakevens() {
  return useQuery({
    queryKey: ['inflation-breakevens'],
    queryFn: () => api.get<any>('/inflation-breakevens'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
