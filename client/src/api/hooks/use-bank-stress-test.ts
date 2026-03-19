import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useBankStressTest() {
  return useQuery({
    queryKey: ['bank-stress-test'],
    queryFn: () => api.get<any>('/bank-stress-test'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
