import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMuniYieldCurves() {
  return useQuery({
    queryKey: ['muni-yield-curves'],
    queryFn: () => api.get<any>('/muni-yield-curves'),
    staleTime: 60 * 60 * 1000,
  });
}
