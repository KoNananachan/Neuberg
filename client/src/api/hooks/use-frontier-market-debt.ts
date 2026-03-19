import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFrontierMarketDebt() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['frontier-market-debt'],
    queryFn: () => api.get<any>('/frontier-market-debt'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
