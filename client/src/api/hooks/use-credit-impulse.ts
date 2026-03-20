import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCreditImpulse() {
  return useQuery({
    queryKey: ['credit-impulse'],
    queryFn: () => api.get<any>('/credit-impulse'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
