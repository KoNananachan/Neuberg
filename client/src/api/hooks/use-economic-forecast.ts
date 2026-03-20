import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEconomicForecast() {
  return useQuery({
    queryKey: ['economic-forecast'],
    queryFn: () => api.get<any>('/economic-forecast'),
    staleTime: 60 * 60 * 1000,
  });
}
