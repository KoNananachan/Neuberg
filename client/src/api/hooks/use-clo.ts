import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCLO() {
  return useQuery({
    queryKey: ['clo'],
    queryFn: () => api.get<any>('/clo'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
