import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePortfolioMargin() {
  return useQuery({
    queryKey: ['portfolio-margin'],
    queryFn: () => api.get<any>('/portfolio-margin'),
    staleTime: 60 * 60 * 1000,
  });
}
