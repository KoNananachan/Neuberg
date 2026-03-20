import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useLeveragedLoan() {
  return useQuery({
    queryKey: ['leveraged-loan'],
    queryFn: () => api.get<any>('/leveraged-loan'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
