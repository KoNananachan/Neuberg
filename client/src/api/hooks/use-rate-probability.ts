import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useRateProbability() {
  return useQuery({
    queryKey: ['rate-probability'],
    queryFn: () => api.get<any>('/rate-probability'),
    staleTime: 60 * 60 * 1000,
  });
}
