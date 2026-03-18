import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useRiskParity() {
  return useQuery({
    queryKey: ['risk-parity'],
    queryFn: () => api.get<any>('/risk-parity'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
