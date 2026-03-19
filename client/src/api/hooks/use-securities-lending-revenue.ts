import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSecuritiesLendingRevenue() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['securities-lending-revenue'],
    queryFn: () => api.get<any>('/securities-lending-revenue'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
