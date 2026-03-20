import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useRateProbability() {
  return useQuery({
    queryKey: ['rate-probability'],
    queryFn: () => api.get<any>('/rate-probability'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
