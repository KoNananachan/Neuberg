import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePensionFund() {
  return useQuery({
    queryKey: ['pension-fund'],
    queryFn: () => api.get<any>('/pension-fund'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
