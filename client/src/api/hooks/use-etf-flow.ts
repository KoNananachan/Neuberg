import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEtfFlow() {
  return useQuery({
    queryKey: ['etf-flow'],
    queryFn: () => api.get<any>('/etf-flow'),
    staleTime: 60 * 60 * 1000,
  });
}
