import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCorrelationRisk() {
  return useQuery({
    queryKey: ['correlation-risk'],
    queryFn: () => api.get<any>('/correlation-risk'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
