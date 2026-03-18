import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCorporateBuyback() {
  return useQuery({
    queryKey: ['corporate-buyback'],
    queryFn: () => api.get<any>('/corporate-buyback'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
