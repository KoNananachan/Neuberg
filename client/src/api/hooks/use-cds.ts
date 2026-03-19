import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCDS() {
  return useQuery({
    queryKey: ['cds'],
    queryFn: () => api.get<any>('/cds'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
