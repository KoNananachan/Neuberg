import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMergerArb() {
  return useQuery({
    queryKey: ['merger-arb'],
    queryFn: () => api.get<any>('/merger-arb'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
