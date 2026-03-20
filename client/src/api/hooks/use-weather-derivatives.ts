import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useWeatherDerivatives() {
  return useQuery({
    queryKey: ['weather-derivatives'],
    queryFn: () => api.get<any>('/weather-derivatives'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
