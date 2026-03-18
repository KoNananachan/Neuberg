import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRealEstateAnalytics() {
  return useQuery({
    queryKey: ['real-estate-analytics'],
    queryFn: () => api.get<any>('/real-estate-analytics'),
    refetchInterval: 5 * 60_000,
    staleTime: 3 * 60_000,
  });
}
