import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCreditRiskTransfer() {
  return useQuery({
    queryKey: ['credit-risk-transfer'],
    queryFn: () => api.get<any>('/credit-risk-transfer'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
