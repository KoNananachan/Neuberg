import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useLeveragedLoan() {
  return useQuery({
    queryKey: ['leveraged-loan'],
    queryFn: () => api.get<any>('/leveraged-loan'),
    staleTime: 60 * 60 * 1000,
  });
}
