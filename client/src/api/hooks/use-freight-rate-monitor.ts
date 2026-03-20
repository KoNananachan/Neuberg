import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFreightRateMonitor() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['freight-rate-monitor'],
    queryFn: () => api.get<any>('/freight-rate-monitor'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
