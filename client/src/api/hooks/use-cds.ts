import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCDS() {
  return useQuery({
    queryKey: ['cds'],
    queryFn: () => api.get<any>('/cds'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
