import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCommodityCurves() {
  return useQuery({
    queryKey: ['commodity-curves'],
    queryFn: () => api.get<any>('/commodity-curves'),
    staleTime: 60 * 60 * 1000,
  });
}
