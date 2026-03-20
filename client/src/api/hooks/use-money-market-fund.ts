import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMoneyMarketFund() {
  return useQuery({
    queryKey: ['money-market-fund'],
    queryFn: () => api.get<any>('/money-market-fund'),
    staleTime: 180000,
  });
}
