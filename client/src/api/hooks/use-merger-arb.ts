import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMergerArb() {
  return useQuery({
    queryKey: ['merger-arb'],
    queryFn: () => api.get<any>('/merger-arb'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
