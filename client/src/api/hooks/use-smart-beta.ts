import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSmartBeta() {
  return useQuery({
    queryKey: ['smart-beta'],
    queryFn: () => api.get<any>('/smart-beta'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
