import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useLeveragedLoan() {
  return useQuery({
    queryKey: ['leveraged-loan'],
    queryFn: () => api.get<any>('/leveraged-loan'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
