import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFreightRateMonitor() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['freight-rate-monitor'],
    queryFn: () => api.get<any>('/freight-rate-monitor'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
