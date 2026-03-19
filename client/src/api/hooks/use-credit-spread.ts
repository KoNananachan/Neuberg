import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCreditSpread() {
  return useQuery({
    queryKey: ['credit-spread'],
    queryFn: () => api.get<any>('/credit-spread'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
