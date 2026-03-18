import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useInsiderSentiment() {
  return useQuery({
    queryKey: ['insider-sentiment'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => api.get<any>('/insider-sentiment'),
    refetchInterval: 5 * 60_000,
    staleTime: 3 * 60_000,
  });
}
