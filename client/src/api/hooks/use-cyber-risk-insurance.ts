import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCyberRiskInsurance() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cyber-risk-insurance'],
    queryFn: () => api.get<any>('/cyber-risk-insurance'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
