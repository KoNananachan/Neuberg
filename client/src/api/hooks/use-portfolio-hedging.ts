import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePortfolioHedging() {
  return useQuery({
    queryKey: ['portfolio-hedging'],
    queryFn: () => api.get<any>('/portfolio-hedging'),
    staleTime: 60 * 60 * 1000,
  });
}
