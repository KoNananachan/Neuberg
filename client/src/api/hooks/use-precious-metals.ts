import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePreciousMetals() {
  return useQuery({
    queryKey: ['precious-metals'],
    queryFn: () => api.get<any>('/precious-metals'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
