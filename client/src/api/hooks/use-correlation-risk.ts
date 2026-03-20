import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCorrelationRisk() {
  return useQuery({
    queryKey: ['correlation-risk'],
    queryFn: () => api.get<any>('/correlation-risk'),
    staleTime: 60 * 60 * 1000,
  });
}
