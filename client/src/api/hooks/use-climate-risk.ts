import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useClimateRisk() {
  return useQuery({
    queryKey: ['climate-risk'],
    queryFn: () => api.get<any>('/climate-risk'),
    staleTime: 60 * 60 * 1000,
  });
}
