import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useBankStressTest() {
  return useQuery({
    queryKey: ['bank-stress-test'],
    queryFn: () => api.get<any>('/bank-stress-test'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
