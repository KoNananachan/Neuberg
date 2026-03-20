import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSwapValuation() {
  return useQuery({
    queryKey: ['swap-valuation'],
    queryFn: () => api.get<any>('/swap-valuation'),
    staleTime: 60 * 60 * 1000,
  });
}
