import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCreditDefaultSwaps() {
  return useQuery({
    queryKey: ['credit-default-swaps'],
    queryFn: () => api.get<any>('/credit-default-swaps'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
