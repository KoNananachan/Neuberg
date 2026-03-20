import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSwapPricing() {
  return useQuery({
    queryKey: ['swap-pricing'],
    queryFn: () => api.get<any>('/swap-pricing'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
