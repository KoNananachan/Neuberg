import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMergerArb() {
  return useQuery({
    queryKey: ['merger-arb'],
    queryFn: () => api.get<any>('/merger-arb'),
    staleTime: 60 * 60 * 1000,
  });
}
