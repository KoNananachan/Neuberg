import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCommodityCurveAnalytics() {
  return useQuery({
    queryKey: ['commodity-curve-analytics'],
    queryFn: () => api.get<any>('/commodity-curve-analytics'),
    staleTime: 60 * 60 * 1000,
  });
}
