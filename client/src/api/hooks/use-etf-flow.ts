import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEtfFlow() {
  return useQuery({
    queryKey: ['etf-flow'],
    queryFn: () => api.get<any>('/etf-flow'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
