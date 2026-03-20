import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useInterestRateVolSurface() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['interest-rate-vol-surface'],
    queryFn: () => api.get<any>('/interest-rate-vol-surface'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
