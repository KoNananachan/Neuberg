import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebtMaturityWall() {
  return useQuery({
    queryKey: ['debt-maturity'],
    queryFn: () => api.get<any>('/debt-maturity'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
