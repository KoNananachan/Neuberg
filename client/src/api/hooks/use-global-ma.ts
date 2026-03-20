import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGlobalMA() {
  return useQuery({
    queryKey: ['global-ma'],
    queryFn: () => api.get<any>('/global-ma'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
