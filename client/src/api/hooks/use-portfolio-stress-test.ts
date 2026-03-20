import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePortfolioStressTest() {
  return useQuery({
    queryKey: ['portfolio-stress-test'],
    queryFn: () => api.get<any>('/portfolio-stress-test'),
    staleTime: 60 * 60 * 1000,
  });
}
