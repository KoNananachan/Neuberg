import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCloTrancheAnalytics() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['clo-tranche-analytics'],
    queryFn: () => api.get<any>('/clo-tranche-analytics'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
