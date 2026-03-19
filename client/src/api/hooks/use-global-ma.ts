import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGlobalMA() {
  return useQuery({
    queryKey: ['global-ma'],
    queryFn: () => api.get<any>('/global-ma'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
