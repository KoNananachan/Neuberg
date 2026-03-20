import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEconomicForecast() {
  return useQuery({
    queryKey: ['economic-forecast'],
    queryFn: () => api.get<any>('/economic-forecast'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
