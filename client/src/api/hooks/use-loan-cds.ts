import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useLoanCds() {
  return useQuery({
    queryKey: ['loan-cds'],
    queryFn: () => api.get<any>('/loan-cds'),
    staleTime: 60 * 60 * 1000,
  });
}
