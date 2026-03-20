import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEmLocalRates() {
  return useQuery({
    queryKey: ['em-local-rates'],
    queryFn: () => api.get<any>('/em-local-rates'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
