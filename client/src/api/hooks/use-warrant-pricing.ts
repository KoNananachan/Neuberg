import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useWarrantPricing() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['warrant-pricing'],
    queryFn: () => api.get<any>('/warrant-pricing'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
