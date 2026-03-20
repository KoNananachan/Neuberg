import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useRiskBudgeting() {
  return useQuery({
    queryKey: ['risk-budgeting'],
    queryFn: () => api.get<any>('/risk-budgeting'),
    staleTime: 60 * 60 * 1000,
  });
}
