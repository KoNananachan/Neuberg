import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePrivateEquitySecondaries() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['private-equity-secondaries'],
    queryFn: () => api.get<any>('/private-equity-secondaries'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
