import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useVarianceSwap() {
  return useQuery({
    queryKey: ['variance-swap'],
    queryFn: () => api.get<any>('/variance-swap'),
    staleTime: 60 * 60 * 1000,
  });
}
