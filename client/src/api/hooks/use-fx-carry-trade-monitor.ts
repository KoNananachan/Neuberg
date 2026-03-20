import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFxCarryTradeMonitor() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['fx-carry-trade-monitor'],
    queryFn: () => api.get<any>('/fx-carry-trade-monitor'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
