import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSovereignYield() {
  return useQuery({
    queryKey: ['sovereign-yield'],
    queryFn: () => api.get<any>('/sovereign-yield'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
