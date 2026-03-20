import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useShippingFreight() {
  return useQuery({
    queryKey: ['shipping-freight'],
    queryFn: () => api.get<any>('/shipping-freight'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
