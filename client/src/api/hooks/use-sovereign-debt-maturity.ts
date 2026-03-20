import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSovereignDebtMaturity() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sovereign-debt-maturity'],
    queryFn: () => api.get<any>('/sovereign-debt-maturity'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
