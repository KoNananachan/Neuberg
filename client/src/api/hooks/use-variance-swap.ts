import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useVarianceSwap() {
  return useQuery({
    queryKey: ['variance-swap'],
    queryFn: () => api.get<any>('/variance-swap'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
