import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGeopoliticalRisk() {
  return useQuery({
    queryKey: ['geopolitical-risk'],
    queryFn: () => api.get<any>('/geopolitical-risk'),
    staleTime: 60 * 60 * 1000,
  });
}
