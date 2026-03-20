import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useShippingIndex() {
  return useQuery({
    queryKey: ['shipping-index'],
    queryFn: () => api.get<any>('/shipping-index'),
    staleTime: 60 * 60 * 1000,
  });
}
