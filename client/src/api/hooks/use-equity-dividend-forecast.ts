import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEquityDividendForecast() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['equity-dividend-forecast'],
    queryFn: () => api.get<any>('/equity-dividend-forecast'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
