import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useBondRelativeValue() {
  return useQuery({
    queryKey: ['bond-relative-value'],
    queryFn: () => api.get<any>('/bond-relative-value'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
