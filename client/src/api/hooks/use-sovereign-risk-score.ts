import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSovereignRiskScore() {
  return useQuery({
    queryKey: ['sovereign-risk-score'],
    queryFn: () => api.get<any>('/sovereign-risk-score'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
