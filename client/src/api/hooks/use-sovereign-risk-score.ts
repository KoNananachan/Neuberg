import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSovereignRiskScore() {
  return useQuery({
    queryKey: ['sovereign-risk-score'],
    queryFn: () => api.get<any>('/sovereign-risk-score'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
