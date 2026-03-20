import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCreditIndex() {
  return useQuery({
    queryKey: ['credit-index'],
    queryFn: () => api.get<any>('/credit-index'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
