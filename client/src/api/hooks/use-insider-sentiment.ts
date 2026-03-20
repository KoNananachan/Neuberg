import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useInsiderSentiment() {
  return useQuery({
    queryKey: ['insider-sentiment'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => api.get<any>('/insider-sentiment'),
    staleTime: 60 * 60_000,
  });
}
