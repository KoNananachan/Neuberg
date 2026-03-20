import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSukukMonitor() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sukuk-monitor'],
    queryFn: () => api.get<any>('/sukuk-monitor'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
