import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useBenchmarkAnalytics() {
  return useQuery({
    queryKey: ['benchmark-analytics'],
    queryFn: () => api.get<any>('/benchmark-analytics'),
    staleTime: 60 * 60 * 1000,
  });
}
