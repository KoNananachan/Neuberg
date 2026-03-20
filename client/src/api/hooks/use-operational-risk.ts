import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useOperationalRisk() {
  return useQuery({
    queryKey: ['operational-risk'],
    queryFn: () => api.get<any>('/operational-risk'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
