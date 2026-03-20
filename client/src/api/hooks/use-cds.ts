import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCDS() {
  return useQuery({
    queryKey: ['cds'],
    queryFn: () => api.get<any>('/cds'),
    staleTime: 60 * 60 * 1000,
  });
}
