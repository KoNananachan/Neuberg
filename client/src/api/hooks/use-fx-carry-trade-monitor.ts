import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFxCarryTradeMonitor() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['fx-carry-trade-monitor'],
    queryFn: () => api.get<any>('/fx-carry-trade-monitor'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
