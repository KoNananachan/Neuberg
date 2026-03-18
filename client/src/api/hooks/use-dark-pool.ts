import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDarkPool() {
  return useQuery({
    queryKey: ['dark-pool'],
    queryFn: () => api.get<any>('/dark-pool'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
