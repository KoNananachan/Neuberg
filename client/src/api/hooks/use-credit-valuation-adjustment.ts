import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCreditValuationAdjustment() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['credit-valuation-adjustment'],
    queryFn: () => api.get<any>('/credit-valuation-adjustment'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
