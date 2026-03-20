import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMoneyMarketRates() {
  return useQuery({
    queryKey: ['money-market-rates'],
    queryFn: () => api.get<any>('/money-market-rates'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
