import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useStructuredProducts() {
  return useQuery({
    queryKey: ['structured-products'],
    queryFn: () => api.get<any>('/structured-products'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
