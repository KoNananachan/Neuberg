import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTreasuryFuturesBasis() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['treasury-futures-basis'],
    queryFn: () => api.get<any>('/treasury-futures-basis'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
