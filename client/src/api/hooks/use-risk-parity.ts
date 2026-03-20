import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useRiskParity() {
  return useQuery({
    queryKey: ['risk-parity'],
    queryFn: () => api.get<any>('/risk-parity'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
