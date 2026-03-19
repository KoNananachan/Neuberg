import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMoneyMarketRates() {
  return useQuery({
    queryKey: ['money-market-rates'],
    queryFn: () => api.get<any>('/money-market-rates'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
