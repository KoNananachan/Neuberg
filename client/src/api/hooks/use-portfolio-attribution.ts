import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePortfolioAttribution() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['portfolio-attribution'],
    queryFn: () => api.get<any>('/portfolio-attribution'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
