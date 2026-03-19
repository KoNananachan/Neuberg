import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useWeatherDerivatives() {
  return useQuery({
    queryKey: ['weather-derivatives'],
    queryFn: () => api.get<any>('/weather-derivatives'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
