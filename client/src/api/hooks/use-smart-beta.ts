import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSmartBeta() {
  return useQuery({
    queryKey: ['smart-beta'],
    queryFn: () => api.get<any>('/smart-beta'),
    staleTime: 60 * 60 * 1000,
  });
}
