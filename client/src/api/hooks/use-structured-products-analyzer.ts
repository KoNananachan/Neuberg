import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useStructuredProductsAnalyzer() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['structured-products-analyzer'],
    queryFn: () => api.get<any>('/structured-products-analyzer'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
