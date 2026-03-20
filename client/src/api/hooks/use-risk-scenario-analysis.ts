import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useRiskScenarioAnalysis() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['risk-scenario-analysis'],
    queryFn: () => api.get<any>('/risk-scenario-analysis'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
