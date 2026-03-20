import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSovereignCds() {
  return useQuery({
    queryKey: ['sovereign-cds'],
    queryFn: () => api.get<any>('/sovereign-cds'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
