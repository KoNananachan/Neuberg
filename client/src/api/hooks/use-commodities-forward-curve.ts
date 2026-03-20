import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCommoditiesForwardCurve() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['commodities-forward-curve'],
    queryFn: () => api.get<any>('/commodities-forward-curve'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
