import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSmartBeta() {
  return useQuery({
    queryKey: ['smart-beta'],
    queryFn: () => api.get<any>('/smart-beta'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
