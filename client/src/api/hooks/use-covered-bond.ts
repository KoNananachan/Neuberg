import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCoveredBond() {
  return useQuery({
    queryKey: ['covered-bond'],
    queryFn: () => api.get<any>('/covered-bond'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
