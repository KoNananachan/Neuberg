import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSyndicatedLoans() {
  return useQuery({
    queryKey: ['syndicated-loans'],
    queryFn: () => api.get<any>('/syndicated-loans'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
