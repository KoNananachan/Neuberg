import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCreditEvent() {
  return useQuery({
    queryKey: ['credit-event'],
    queryFn: () => api.get<any>('/credit-event'),
    staleTime: 60 * 60 * 1000,
  });
}
