import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSovereignCds() {
  return useQuery({
    queryKey: ['sovereign-cds'],
    queryFn: () => api.get<any>('/sovereign-cds'),
    staleTime: 60 * 60 * 1000,
  });
}
