import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCurrencyBasket() {
  return useQuery({
    queryKey: ['currency-basket'],
    queryFn: () => api.get<any>('/currency-basket'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
