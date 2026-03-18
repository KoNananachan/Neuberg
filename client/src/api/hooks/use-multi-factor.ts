import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMultiFactor() {
  return useQuery({
    queryKey: ['multi-factor'],
    queryFn: () => api.get<any>('/multi-factor'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
