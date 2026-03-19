import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFxCarryTradeMonitor() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['fx-carry-trade-monitor'],
    queryFn: () => api.get<any>('/fx-carry-trade-monitor'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
