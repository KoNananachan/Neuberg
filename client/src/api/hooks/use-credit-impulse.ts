import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCreditImpulse() {
  return useQuery({
    queryKey: ['credit-impulse'],
    queryFn: () => api.get<any>('/credit-impulse'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
