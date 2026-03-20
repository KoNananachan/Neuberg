import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePortfolioHedging() {
  return useQuery({
    queryKey: ['portfolio-hedging'],
    queryFn: () => api.get<any>('/portfolio-hedging'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
