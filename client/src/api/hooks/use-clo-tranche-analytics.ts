import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCloTrancheAnalytics() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['clo-tranche-analytics'],
    queryFn: () => api.get<any>('/clo-tranche-analytics'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
