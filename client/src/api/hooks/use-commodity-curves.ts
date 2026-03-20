import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCommodityCurves() {
  return useQuery({
    queryKey: ['commodity-curves'],
    queryFn: () => api.get<any>('/commodity-curves'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
