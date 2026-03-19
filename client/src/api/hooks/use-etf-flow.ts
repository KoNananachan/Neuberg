import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEtfFlow() {
  return useQuery({
    queryKey: ['etf-flow'],
    queryFn: () => api.get<any>('/etf-flow'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
