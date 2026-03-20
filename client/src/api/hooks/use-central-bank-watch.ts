import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCentralBankWatch() {
  return useQuery({
    queryKey: ['central-bank-watch'],
    queryFn: () => api.get<any>('/central-bank-watch'),
    staleTime: 60 * 60 * 1000,
  });
}
