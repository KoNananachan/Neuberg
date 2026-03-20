import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSwapPricing() {
  return useQuery({
    queryKey: ['swap-pricing'],
    queryFn: () => api.get<any>('/swap-pricing'),
    staleTime: 60 * 60 * 1000,
  });
}
