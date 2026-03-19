import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEconomicForecast() {
  return useQuery({
    queryKey: ['economic-forecast'],
    queryFn: () => api.get<any>('/economic-forecast'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
