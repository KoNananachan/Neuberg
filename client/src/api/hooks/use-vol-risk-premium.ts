import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useVolRiskPremium() {
  return useQuery({
    queryKey: ['vol-risk-premium'],
    queryFn: () => api.get<any>('/vol-risk-premium'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
