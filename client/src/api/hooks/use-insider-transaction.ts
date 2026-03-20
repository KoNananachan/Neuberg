import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useInsiderTransaction() {
  return useQuery({
    queryKey: ['insider-transaction'],
    queryFn: () => api.get<any>('/insider-transaction'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
