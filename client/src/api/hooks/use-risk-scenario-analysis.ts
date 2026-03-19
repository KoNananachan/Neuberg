import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useRiskScenarioAnalysis() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['risk-scenario-analysis'],
    queryFn: () => api.get<any>('/risk-scenario-analysis'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
