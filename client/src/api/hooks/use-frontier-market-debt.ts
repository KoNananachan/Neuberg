import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFrontierMarketDebt() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['frontier-market-debt'],
    queryFn: () => api.get<any>('/frontier-market-debt'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
