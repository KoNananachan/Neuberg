import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePrivateCredit() {
  return useQuery({
    queryKey: ['private-credit'],
    queryFn: () => api.get<any>('/private-credit'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
