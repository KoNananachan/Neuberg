import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePrivateCredit() {
  return useQuery({
    queryKey: ['private-credit'],
    queryFn: () => api.get<any>('/private-credit'),
    staleTime: 60 * 60 * 1000,
  });
}
