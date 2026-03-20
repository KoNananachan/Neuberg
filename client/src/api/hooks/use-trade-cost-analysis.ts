import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useTradeCostAnalysis() {
  return useQuery({
    queryKey: ['trade-cost-analysis'],
    queryFn: () => api.get<any>('/trade-cost-analysis'),
    staleTime: 60 * 60 * 1000,
  });
}
