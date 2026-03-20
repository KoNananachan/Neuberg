import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useStructuredProduct() {
  return useQuery({
    queryKey: ['structured-product'],
    queryFn: () => api.get<any>('/structured-product'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
