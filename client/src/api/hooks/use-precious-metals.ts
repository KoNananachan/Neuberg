import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePreciousMetals() {
  return useQuery({
    queryKey: ['precious-metals'],
    queryFn: () => api.get<any>('/precious-metals'),
    staleTime: 60 * 60 * 1000,
  });
}
