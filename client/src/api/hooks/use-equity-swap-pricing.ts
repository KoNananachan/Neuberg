import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEquitySwapPricing() {
  return useQuery({
    queryKey: ['equity-swap-pricing'],
    queryFn: () => api.get<any>('/equity-swap-pricing'),
    staleTime: 180000,
  });
}
