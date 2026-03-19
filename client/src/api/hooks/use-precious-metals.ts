import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePreciousMetals() {
  return useQuery({
    queryKey: ['precious-metals'],
    queryFn: () => api.get<any>('/precious-metals'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
