import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useStructuredCredit() {
  return useQuery({
    queryKey: ['structured-credit'],
    queryFn: () => api.get<any>('/structured-credit'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
