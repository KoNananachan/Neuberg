import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGeopoliticalRisk() {
  return useQuery({
    queryKey: ['geopolitical-risk'],
    queryFn: () => api.get<any>('/geopolitical-risk'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
