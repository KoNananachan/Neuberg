import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useVolatilityDashboard() {
  return useQuery({
    queryKey: ['volatility-dashboard'],
    queryFn: () => api.get<any>('/volatility-dashboard'),
    staleTime: 60 * 60 * 1000,
  });
}
