import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useBankStressTest() {
  return useQuery({
    queryKey: ['bank-stress-test'],
    queryFn: () => api.get<any>('/bank-stress-test'),
    staleTime: 60 * 60 * 1000,
  });
}
