import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCreditSpread() {
  return useQuery({
    queryKey: ['credit-spread'],
    queryFn: () => api.get<any>('/credit-spread'),
    staleTime: 60 * 60 * 1000,
  });
}
