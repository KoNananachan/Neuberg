import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useBenchmarkAnalytics() {
  return useQuery({
    queryKey: ['benchmark-analytics'],
    queryFn: () => api.get<any>('/benchmark-analytics'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
