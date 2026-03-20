import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDarkPool() {
  return useQuery({
    queryKey: ['dark-pool'],
    queryFn: () => api.get<any>('/dark-pool'),
    staleTime: 60 * 60 * 1000,
  });
}
