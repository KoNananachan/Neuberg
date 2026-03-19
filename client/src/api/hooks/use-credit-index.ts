import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCreditIndex() {
  return useQuery({
    queryKey: ['credit-index'],
    queryFn: () => api.get<any>('/credit-index'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
