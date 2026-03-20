import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCLO() {
  return useQuery({
    queryKey: ['clo'],
    queryFn: () => api.get<any>('/clo'),
    staleTime: 60 * 60 * 1000,
  });
}
