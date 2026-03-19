import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEquitySwapPricing() {
  return useQuery({
    queryKey: ['equity-swap-pricing'],
    queryFn: () => api.get<any>('/equity-swap-pricing'),
    refetchInterval: 300000,
    staleTime: 180000,
  });
}
