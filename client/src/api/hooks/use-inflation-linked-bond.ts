import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useInflationLinkedBond() {
  return useQuery({
    queryKey: ['inflation-linked-bond'],
    queryFn: () => api.get<any>('/inflation-linked-bond'),
    staleTime: 60 * 60 * 1000,
  });
}
