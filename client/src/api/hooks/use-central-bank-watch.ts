import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCentralBankWatch() {
  return useQuery({
    queryKey: ['central-bank-watch'],
    queryFn: () => api.get<any>('/central-bank-watch'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
