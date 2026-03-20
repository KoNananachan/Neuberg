import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMunicipalCreditAnalysis() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['municipal-credit-analysis'],
    queryFn: () => api.get<any>('/municipal-credit-analysis'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
