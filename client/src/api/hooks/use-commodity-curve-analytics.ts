import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCommodityCurveAnalytics() {
  return useQuery({
    queryKey: ['commodity-curve-analytics'],
    queryFn: () => api.get<any>('/commodity-curve-analytics'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
