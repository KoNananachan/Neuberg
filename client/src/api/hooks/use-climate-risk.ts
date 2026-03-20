import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useClimateRisk() {
  return useQuery({
    queryKey: ['climate-risk'],
    queryFn: () => api.get<any>('/climate-risk'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
