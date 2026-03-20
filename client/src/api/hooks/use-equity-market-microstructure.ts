import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEquityMarketMicrostructure() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['equity-market-microstructure'],
    queryFn: () => api.get<any>('/equity-market-microstructure'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
