import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useLoanCds() {
  return useQuery({
    queryKey: ['loan-cds'],
    queryFn: () => api.get<any>('/loan-cds'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
