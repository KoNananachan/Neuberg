import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePortfolioMargin() {
  return useQuery({
    queryKey: ['portfolio-margin'],
    queryFn: () => api.get<any>('/portfolio-margin'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
