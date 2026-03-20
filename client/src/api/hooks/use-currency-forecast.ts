import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCurrencyForecast() {
  return useQuery({
    queryKey: ['currency-forecast'],
    queryFn: () => api.get<any>('/currency-forecast'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
