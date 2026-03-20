import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRepoRate() {
  return useQuery({
    queryKey: ['repo-rate'],
    queryFn: () => api.get<any>('/repo-rate'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
