import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSecuritiesLending() {
  return useQuery({
    queryKey: ['securities-lending'],
    queryFn: () => api.get<any>('/securities-lending'),
    staleTime: 60 * 60 * 1000,
  });
}
