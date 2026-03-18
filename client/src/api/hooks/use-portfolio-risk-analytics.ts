import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePortfolioRiskAnalytics() {
  return useQuery({
    queryKey: ['portfolio-risk-analytics'],
    queryFn: () => api.get<any>('/portfolio-risk-analytics'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
