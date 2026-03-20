import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useStructuredProducts() {
  return useQuery({
    queryKey: ['structured-products'],
    queryFn: () => api.get<any>('/structured-products'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
