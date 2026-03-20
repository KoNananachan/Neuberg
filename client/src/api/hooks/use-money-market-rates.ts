import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMoneyMarketRates() {
  return useQuery({
    queryKey: ['money-market-rates'],
    queryFn: () => api.get<any>('/money-market-rates'),
    staleTime: 60 * 60 * 1000,
  });
}
