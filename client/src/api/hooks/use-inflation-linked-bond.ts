import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useInflationLinkedBond() {
  return useQuery({
    queryKey: ['inflation-linked-bond'],
    queryFn: () => api.get<any>('/inflation-linked-bond'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
