import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useRiskParity() {
  return useQuery({
    queryKey: ['risk-parity'],
    queryFn: () => api.get<any>('/risk-parity'),
    staleTime: 60 * 60 * 1000,
  });
}
