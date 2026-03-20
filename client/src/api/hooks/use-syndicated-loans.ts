import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSyndicatedLoans() {
  return useQuery({
    queryKey: ['syndicated-loans'],
    queryFn: () => api.get<any>('/syndicated-loans'),
    staleTime: 60 * 60 * 1000,
  });
}
