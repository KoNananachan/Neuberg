import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMunicipalCreditAnalysis() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['municipal-credit-analysis'],
    queryFn: () => api.get<any>('/municipal-credit-analysis'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
