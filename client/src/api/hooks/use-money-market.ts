import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMoneyMarket() {
  return useQuery({
    queryKey: ['money-market'],
    queryFn: () => api.get<any>('/money-market'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
