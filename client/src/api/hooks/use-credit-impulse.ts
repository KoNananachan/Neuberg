import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCreditImpulse() {
  return useQuery({
    queryKey: ['credit-impulse'],
    queryFn: () => api.get<any>('/credit-impulse'),
    staleTime: 60 * 60 * 1000,
  });
}
