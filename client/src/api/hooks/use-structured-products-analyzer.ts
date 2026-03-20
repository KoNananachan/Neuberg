import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useStructuredProductsAnalyzer() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['structured-products-analyzer'],
    queryFn: () => api.get<any>('/structured-products-analyzer'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
