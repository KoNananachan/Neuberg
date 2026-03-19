import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useShippingFreight() {
  return useQuery({
    queryKey: ['shipping-freight'],
    queryFn: () => api.get<any>('/shipping-freight'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
