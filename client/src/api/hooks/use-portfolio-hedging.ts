import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePortfolioHedging() {
  return useQuery({
    queryKey: ['portfolio-hedging'],
    queryFn: () => api.get<any>('/portfolio-hedging'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
