import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useOperationalRisk() {
  return useQuery({
    queryKey: ['operational-risk'],
    queryFn: () => api.get<any>('/operational-risk'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
