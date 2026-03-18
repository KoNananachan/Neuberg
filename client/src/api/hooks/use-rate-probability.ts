import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useRateProbability() {
  return useQuery({
    queryKey: ['rate-probability'],
    queryFn: () => api.get<any>('/rate-probability'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
