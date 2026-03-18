import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useBenchmarkAnalytics() {
  return useQuery({
    queryKey: ['benchmark-analytics'],
    queryFn: () => api.get<any>('/benchmark-analytics'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
