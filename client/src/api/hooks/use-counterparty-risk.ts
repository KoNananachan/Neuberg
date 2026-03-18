import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCounterpartyRisk() {
  return useQuery({
    queryKey: ['counterparty-risk'],
    queryFn: () => api.get<any>('/counterparty-risk'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
