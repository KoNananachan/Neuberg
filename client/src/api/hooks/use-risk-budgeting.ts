import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useRiskBudgeting() {
  return useQuery({
    queryKey: ['risk-budgeting'],
    queryFn: () => api.get<any>('/risk-budgeting'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
