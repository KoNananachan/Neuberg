import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePortfolioMargin() {
  return useQuery({
    queryKey: ['portfolio-margin'],
    queryFn: () => api.get<any>('/portfolio-margin'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
