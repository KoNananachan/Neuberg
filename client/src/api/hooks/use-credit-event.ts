import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCreditEvent() {
  return useQuery({
    queryKey: ['credit-event'],
    queryFn: () => api.get<any>('/credit-event'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
