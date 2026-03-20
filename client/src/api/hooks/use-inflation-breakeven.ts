import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useInflationBreakeven() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['inflation-breakeven'],
    queryFn: () => api.get<any>('/inflation-breakeven'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
