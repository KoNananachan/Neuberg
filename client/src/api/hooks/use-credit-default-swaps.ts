import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCreditDefaultSwaps() {
  return useQuery({
    queryKey: ['credit-default-swaps'],
    queryFn: () => api.get<any>('/credit-default-swaps'),
    staleTime: 60 * 60 * 1000,
  });
}
