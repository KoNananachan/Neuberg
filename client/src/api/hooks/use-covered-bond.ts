import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCoveredBond() {
  return useQuery({
    queryKey: ['covered-bond'],
    queryFn: () => api.get<any>('/covered-bond'),
    staleTime: 60 * 60 * 1000,
  });
}
