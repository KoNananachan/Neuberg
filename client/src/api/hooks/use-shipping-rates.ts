import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useShippingRates() {
  return useQuery({
    queryKey: ['shipping-rates'],
    queryFn: () => api.get<any>('/shipping-rates'),
    staleTime: 60 * 60 * 1000,
  });
}
