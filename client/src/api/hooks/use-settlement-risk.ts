import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSettlementRisk() {
  return useQuery({
    queryKey: ['settlement-risk'],
    queryFn: () => api.get<any>('/settlement-risk'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
