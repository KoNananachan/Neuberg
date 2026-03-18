import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCreditEvent() {
  return useQuery({
    queryKey: ['credit-event'],
    queryFn: () => api.get<any>('/credit-event'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
