import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useRiskBudgeting() {
  return useQuery({
    queryKey: ['risk-budgeting'],
    queryFn: () => api.get<any>('/risk-budgeting'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
