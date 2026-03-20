import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCreditPortfolio() {
  return useQuery({
    queryKey: ['credit-portfolio'],
    queryFn: () => api.get<any>('/credit-portfolio'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
