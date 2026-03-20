import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useStructuredProducts() {
  return useQuery({
    queryKey: ['structured-products'],
    queryFn: () => api.get<any>('/structured-products'),
    staleTime: 60 * 60 * 1000,
  });
}
