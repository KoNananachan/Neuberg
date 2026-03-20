import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCreditIndex() {
  return useQuery({
    queryKey: ['credit-index'],
    queryFn: () => api.get<any>('/credit-index'),
    staleTime: 60 * 60 * 1000,
  });
}
