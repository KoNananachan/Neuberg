import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCentralBankWatch() {
  return useQuery({
    queryKey: ['central-bank-watch'],
    queryFn: () => api.get<any>('/central-bank-watch'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
