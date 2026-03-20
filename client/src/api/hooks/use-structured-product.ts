import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useStructuredProduct() {
  return useQuery({
    queryKey: ['structured-product'],
    queryFn: () => api.get<any>('/structured-product'),
    staleTime: 60 * 60 * 1000,
  });
}
