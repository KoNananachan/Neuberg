import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCurrencyOptions() {
  return useQuery({
    queryKey: ['currency-options'],
    queryFn: () => api.get<any>('/currency-options'),
    staleTime: 60 * 60 * 1000,
  });
}
