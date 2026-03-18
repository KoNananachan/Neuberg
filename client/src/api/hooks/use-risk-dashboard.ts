import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRiskDashboard() {
  return useQuery({
    queryKey: ['risk-dashboard'],
    queryFn: () => api.get<any>('/risk-dashboard'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
