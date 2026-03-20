import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useWeatherDerivatives() {
  return useQuery({
    queryKey: ['weather-derivatives'],
    queryFn: () => api.get<any>('/weather-derivatives'),
    staleTime: 60 * 60 * 1000,
  });
}
