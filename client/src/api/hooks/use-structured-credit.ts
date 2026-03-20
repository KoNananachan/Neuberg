import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useStructuredCredit() {
  return useQuery({
    queryKey: ['structured-credit'],
    queryFn: () => api.get<any>('/structured-credit'),
    staleTime: 60 * 60 * 1000,
  });
}
