import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePortfolioAttribution() {
  return useQuery({
    queryKey: ['portfolio-attribution'],
    queryFn: () => api.get<any>('/portfolio-attribution'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
