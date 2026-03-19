import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCorrelationRisk() {
  return useQuery({
    queryKey: ['correlation-risk'],
    queryFn: () => api.get<any>('/correlation-risk'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
