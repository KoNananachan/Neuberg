import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useGlobalPmi() {
  return useQuery({
    queryKey: ['global-pmi'],
    queryFn: () => api.get<any>('/global-pmi'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
