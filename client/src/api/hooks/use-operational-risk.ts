import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useOperationalRisk() {
  return useQuery({
    queryKey: ['operational-risk'],
    queryFn: () => api.get<any>('/operational-risk'),
    staleTime: 60 * 60 * 1000,
  });
}
