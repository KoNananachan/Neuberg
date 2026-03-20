import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGlobalMA() {
  return useQuery({
    queryKey: ['global-ma'],
    queryFn: () => api.get<any>('/global-ma'),
    staleTime: 60 * 60 * 1000,
  });
}
