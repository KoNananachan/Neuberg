import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMoneyMarket() {
  return useQuery({
    queryKey: ['money-market'],
    queryFn: () => api.get<any>('/money-market'),
    staleTime: 60 * 60 * 1000,
  });
}
