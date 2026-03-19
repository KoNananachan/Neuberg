import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useShippingIndex() {
  return useQuery({
    queryKey: ['shipping-index'],
    queryFn: () => api.get<any>('/shipping-index'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
