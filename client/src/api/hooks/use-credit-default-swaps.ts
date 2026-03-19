import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCreditDefaultSwaps() {
  return useQuery({
    queryKey: ['credit-default-swaps'],
    queryFn: () => api.get<any>('/credit-default-swaps'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
