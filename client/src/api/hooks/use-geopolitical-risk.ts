import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGeopoliticalRisk() {
  return useQuery({
    queryKey: ['geopolitical-risk'],
    queryFn: () => api.get<any>('/geopolitical-risk'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
