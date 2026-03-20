import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRepoMarket() {
  return useQuery({
    queryKey: ['repo-market'],
    queryFn: () => api.get<any>('/repo-market'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
