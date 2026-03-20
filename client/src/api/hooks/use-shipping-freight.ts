import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useShippingFreight() {
  return useQuery({
    queryKey: ['shipping-freight'],
    queryFn: () => api.get<any>('/shipping-freight'),
    staleTime: 60 * 60 * 1000,
  });
}
