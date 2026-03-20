import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useDividendForecast() {
  return useQuery({
    queryKey: ['dividend-forecast'],
    queryFn: () => api.get<any>('/dividend-forecast'),
    staleTime: 60 * 60 * 1000,
  });
}
