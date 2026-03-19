import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSovereignDebtMaturity() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sovereign-debt-maturity'],
    queryFn: () => api.get<any>('/sovereign-debt-maturity'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
