import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEquityDividendForecast() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['equity-dividend-forecast'],
    queryFn: () => api.get<any>('/equity-dividend-forecast'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
