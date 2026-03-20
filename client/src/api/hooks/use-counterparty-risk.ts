import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCounterpartyRisk() {
  return useQuery({
    queryKey: ['counterparty-risk'],
    queryFn: () => api.get<any>('/counterparty-risk'),
    staleTime: 60 * 60 * 1000,
  });
}
