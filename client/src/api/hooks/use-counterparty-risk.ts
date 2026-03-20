import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCounterpartyRisk() {
  return useQuery({
    queryKey: ['counterparty-risk'],
    queryFn: () => api.get<any>('/counterparty-risk'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
