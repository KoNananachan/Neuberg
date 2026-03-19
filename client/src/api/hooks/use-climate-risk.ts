import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useClimateRisk() {
  return useQuery({
    queryKey: ['climate-risk'],
    queryFn: () => api.get<any>('/climate-risk'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
